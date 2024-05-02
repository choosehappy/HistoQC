from __future__ import annotations
from histoqc.array_adapter.typing import TYPE_NP, TYPE_CP, TYPE_ARRAY
from histoqc.array_adapter.func_mapping import FUNC_MAP
import numpy as np
from numbers import Number
from typing import Callable, Mapping, Tuple, Optional, Any, Iterable
from typing_extensions import Self, TypeGuard
from histoqc.import_wrapper.cupy_extra import cupy as cp
from enum import Enum
import logging
import functools
from operator import and_, or_, xor, add, mul, sub, matmul, floordiv, truediv
import skimage


def cupy_installed() -> bool:
    try:
        import cupy
        return True
    except ImportError:
        return False


class ArrayDevice(Enum):
    CPU: str = 'cpu'
    CUDA: str = 'cuda'

    @classmethod
    def from_bool(cls, on_cpu: bool):
        value = 'cpu' if on_cpu else 'cuda'
        return cls(value)

    @classmethod
    def from_str(cls, str_val: str):
        assert isinstance(str_val, str)
        return cls(str_val)

    @classmethod
    def build(cls, value: str | Self):
        if isinstance(value, cls):
            return value
        if isinstance(value, str):
            return cls.from_str(value)
        raise TypeError(f'Unexpected type {type(value)}')


class ArrayAdapter(Callable):

    func_map: Mapping[Callable, Callable]
    input_device: Optional[str | ArrayDevice]
    output_device: Optional[str | ArrayDevice]
    contingent_type: ArrayDevice

    TYPE_CONTINGENT_DEFAULT: ArrayDevice = ArrayDevice.CUDA

    @staticmethod
    def is_numpy(arr: TYPE_NP) -> TypeGuard[TYPE_NP]:
        return isinstance(arr, np.ndarray)

    @staticmethod
    def is_cupy(arr: TYPE_CP) -> TypeGuard[TYPE_CP]:
        return cupy_installed() and isinstance(arr, cp.ndarray)

    @staticmethod
    def to_numpy(arr: TYPE_ARRAY, copy: bool = False) -> TYPE_NP:
        if ArrayAdapter.is_numpy(arr) or isinstance(arr, Number):
            return np.array(arr, copy=copy)
        assert ArrayAdapter.is_cupy(arr)
        return arr.get()

    @staticmethod
    def to_cupy(arr: TYPE_ARRAY | Number, copy: bool = False) -> TYPE_CP:
        assert isinstance(arr, Number) or (ArrayAdapter.is_array(arr) and cupy_installed()), \
            f"arr must be array and cupy must be installed. {type(arr)}, {cupy_installed()}"
        return cp.array(arr, copy=copy)

    @staticmethod
    def array_device_type(arr: TYPE_ARRAY) -> ArrayDevice:
        on_cpu = isinstance(arr, np.ndarray)
        return ArrayDevice.from_bool(on_cpu)

    @staticmethod
    def is_array(arr: TYPE_ARRAY) -> bool:
        return isinstance(arr, np.ndarray) or (cupy_installed() and isinstance(arr, cp.ndarray))

    @classmethod
    def new_array(cls, arr: Any, array_device: ArrayDevice) -> TYPE_ARRAY:
        if cls.is_array(arr):
            return cls.move_to_device(arr, array_device, copy=False)
        if isinstance(arr, Iterable):
            arr = cls.curate_array_device(*arr, device=array_device, copy=False)
        if array_device is array_device.CUDA:
            assert cupy_installed()
            return cp.asarray(arr)
        elif array_device is array_device.CPU:
            return np.asarray(arr)
        raise TypeError(f'Unexpected device {ArrayDevice}')

    def asarray(self, arr: Any) -> TYPE_ARRAY:
        return self.__class__.new_array(arr, self.output_device)

    @classmethod
    def move_to_device(cls,
                       arr: Optional[TYPE_ARRAY],
                       device: Optional[ArrayDevice], copy: bool = False) -> TYPE_ARRAY:
        # structural match > py3.10
        if device is None or not cls.is_array(arr):
            return arr
        if device is ArrayDevice.CPU:
            return ArrayAdapter.to_numpy(arr, copy=copy)
        elif device is ArrayDevice.CUDA:
            return ArrayAdapter.to_cupy(arr, copy=copy)
        raise ValueError(f"Unsupported device: {device}")

    def sync(self, arr: Optional[TYPE_ARRAY | Number], copy: bool = False) -> TYPE_ARRAY:
        if not self.__class__.is_array(arr):
            return arr
        return self.__class__.move_to_device(arr, device=self.output_device, copy=copy)

    @classmethod
    def curate_device_helper(cls, output: TYPE_ARRAY, device: Optional[ArrayDevice], copy: bool):
        if output is not None and cls.is_array(output):
            output = cls.move_to_device(output, device, copy=copy)
        return output

    @classmethod
    def curate_array_device(cls, *arrays: TYPE_ARRAY,
                            device: Optional[ArrayDevice], copy: bool) -> TYPE_ARRAY | Tuple[TYPE_ARRAY, ...]:
        # already an array - no need to recursively unpack
        if cls.is_array(arrays):
            return cls.curate_device_helper(arrays, device, copy)
        # not array and not iterable --> unpack
        if not isinstance(arrays, Iterable):
            return arrays
        # only one input
        if len(arrays) == 1:
            return cls.curate_device_helper(arrays[0], device=device, copy=copy)
        out_list = []
        for o in arrays:
            out_list.append(cls.curate_device_helper(o, device=device, copy=copy))
        return tuple(out_list)

    @staticmethod
    def get_api(cpu_func: Callable,
                func_map: Mapping[Callable, Callable], device_type: ArrayDevice) -> Tuple[Callable, ArrayDevice]:
        if device_type == ArrayDevice.CPU:
            return cpu_func, ArrayDevice.CPU
        mapped = func_map.get(cpu_func, None)
        if mapped is not None:
            return mapped, ArrayDevice.CUDA
        # if not implemented
        func_name = getattr(cpu_func, '__qualname__', cpu_func.__name__)
        logging.info(f"{__name__}: {func_name} does not have a GPU implementation. Revert to CPU")
        return cpu_func, ArrayDevice.CPU

    @classmethod
    def unified_call(cls,
                     cpu_func: Callable,
                     func_map: Mapping[Callable, Callable],
                     input_device: Optional[str | ArrayDevice],
                     output_device: Optional[str | ArrayDevice],
                     data: TYPE_ARRAY, *args, **kwargs) -> TYPE_ARRAY:
        # use input_device to override the current device, if not None
        data = cls.curate_array_device(data, device=input_device, copy=False)
        input_type = cls.array_device_type(data)
        # attempt to fetch the op, revert to CPU if GPU impl is not available
        func, func_device = cls.get_api(cpu_func, func_map, input_type)
        func_in = cls.curate_array_device(data, device=func_device, copy=False)

        curated_args = cls.curate_array_device(*args, device=func_device, copy=False)
        curated_kwargs = dict()

        for k, v in kwargs.items():
            curated_kwargs[k] = cls.curate_array_device(v, device=func_device, copy=False)

        output = func(func_in, *curated_args, **curated_kwargs)
        # only move the output around if the output is an array
        if isinstance(output, tuple):
            return cls.curate_array_device(*output, device=output_device, copy=False)
        return cls.curate_array_device(output, device=output_device, copy=False)

    @classmethod
    def _validate_device(cls, device_type: Optional[ArrayDevice]) -> Optional[ArrayDevice]:
        if device_type is None:
            return None
        if device_type is ArrayDevice.CPU:
            return device_type
        assert device_type is ArrayDevice.CUDA, f"Unsupported device_type: {device_type}"
        if not cupy_installed():
            logging.info(f"Cupy is not installed. Revert to CPU")
            return ArrayDevice.CPU
        return device_type

    def __init__(self,
                 input_device: Optional[str | ArrayDevice],
                 output_device: Optional[str | ArrayDevice],
                 func_map: Mapping[Callable, Callable],
                 contingent_type: ArrayDevice,
                 ):
        self.input_device = self.__class__._validate_device(input_device)
        self.output_device = self.__class__._validate_device(output_device)
        self.func_map = func_map
        self.contingent_type = contingent_type

    @classmethod
    def build(cls,
              input_device: Optional[str | ArrayDevice],
              output_device: Optional[str | ArrayDevice],
              func_map: Mapping[Callable, Callable] = FUNC_MAP,
              contingent_type: ArrayDevice = TYPE_CONTINGENT_DEFAULT):
        return cls(input_device=input_device, output_device=output_device, func_map=func_map,
                   contingent_type=contingent_type)

    def apply(self, /, cpu_func: Callable, data: TYPE_ARRAY, *args, **kwargs) -> TYPE_ARRAY:
        return self.unified_call(cpu_func, self.func_map, self.input_device, self.output_device,
                                 data, *args, **kwargs)

    def __call__(self, cpu_func: Callable) -> Callable:
        return functools.partial(self.apply, cpu_func)

    @staticmethod
    def __sync_device_output_helper(*arrays: TYPE_ARRAY) -> TYPE_ARRAY | Tuple[TYPE_ARRAY, ...]:
        assert len(arrays) > 0
        if len(arrays) == 1:
            return arrays[0]
        return arrays

    @classmethod
    def device_sync_all_helper(cls, *arrays: TYPE_ARRAY,
                               array_device: Optional[ArrayDevice],
                               contingent_type: Optional[ArrayDevice]) -> TYPE_ARRAY | Tuple[TYPE_ARRAY, ...]:
        assert isinstance(arrays, tuple), f"input check. {type(arrays)} is not a tuple"
        if array_device is not None:
            return cls.__sync_device_output_helper(tuple(cls.move_to_device(arr, array_device) for arr in arrays))
        assert array_device is None
        has_contingent_device = any(cls.array_device_type(arr) is contingent_type for arr in arrays)
        if has_contingent_device:
            assert contingent_type is not None
            return cls.__sync_device_output_helper(cls.device_sync_all_helper(*arrays,
                                                                              array_device=contingent_type,
                                                                              contingent_type=None))
        return cls.__sync_device_output_helper(arrays)

    def device_sync_all(self, *arrays: TYPE_ARRAY) -> TYPE_ARRAY | Tuple[TYPE_ARRAY, ...]:
        return self.__class__.device_sync_all_helper(*arrays, array_device=self.output_device,
                                                     contingent_type=self.contingent_type)

    @classmethod
    def binary_operation(cls, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY,
                         input_device: Optional[ArrayDevice],
                         output_device: Optional[ArrayDevice],
                         contingent_type: Optional[ArrayDevice],
                         op: Callable) -> TYPE_ARRAY:
        arr1, arr2 = cls.device_sync_all_helper(arr1, arr2, array_device=input_device,
                                                contingent_type=contingent_type)
        result: TYPE_ARRAY = op(arr1, arr2)
        return cls.curate_array_device(result, device=output_device, copy=False)

    def and_(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_type=self.contingent_type,
                                               op=and_)

    def or_(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_type=self.contingent_type,
                                               op=or_)

    def add(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_type=self.contingent_type,
                                               op=add)

    def sub(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_type=self.contingent_type,
                                               op=sub)

    def mul(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_type=self.contingent_type,
                                               op=mul)

    def matmul(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_type=self.contingent_type,
                                               op=matmul)

    def truediv(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_type=self.contingent_type,
                                               op=truediv)

    def floordiv(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_type=self.contingent_type,
                                               op=floordiv)

    def xor(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_type=self.contingent_type,
                                               op=xor)

    @classmethod
    def imsave(cls, filename: str, arr: TYPE_ARRAY):
        arr = cls.curate_array_device(arr, device=ArrayDevice.CPU, copy=False)
        return skimage.io.imsave(filename, arr)
