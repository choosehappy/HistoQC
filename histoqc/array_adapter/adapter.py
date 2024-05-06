from __future__ import annotations
from histoqc.array_adapter.typing import TYPE_NP, TYPE_CP, TYPE_ARRAY
from histoqc.array_adapter.func_mapping import FUNC_MAP
import numpy as np
from numbers import Number
from typing import Callable, Mapping, Tuple, Optional, Any, Iterable, Dict
from typing_extensions import Self, TypeGuard
from histoqc.import_wrapper.cupy_extra import cupy as cp
from enum import Enum
import logging
import functools
from operator import and_, or_, xor, add, mul, sub, matmul, floordiv, truediv
import skimage
import re


def cupy_installed() -> bool:
    try:
        import cupy
        return True
    except ImportError:
        return False


class ArrayDeviceType(Enum):
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
    def build(cls, value: str | Self) -> Self:
        if isinstance(value, cls):
            return value
        if isinstance(value, str):
            return cls.from_str(value)
        raise TypeError(f'Unexpected type {type(value)}')


class Device:
    __device_type: ArrayDeviceType
    __device_id: Optional[int]
    __instances: Dict[Tuple[ArrayDeviceType, Optional[int]], Self] = dict()
    _is_initialized: bool
    DEFAULT_ID: int = 0

    DEVICE_CPU: str = 'cpu'
    DEVICE_CUDA: str = 'cuda'

    def is_cpu(self) -> bool:
        return self.__device_type is ArrayDeviceType.CPU

    def is_cuda(self) -> bool:
        return self.__device_type is ArrayDeviceType.CUDA

    @property
    def device_type(self) -> ArrayDeviceType:
        return self.__device_type

    @property
    def device_id(self) -> Optional[int]:
        return self.__device_id

    def __init__(self, device_type: ArrayDeviceType, device_id: Optional[int] = None) -> None:
        if not hasattr(self, "_is_initialized") or not self._is_initialized:
            self.__device_type = device_type
            if self.is_cuda() and device_id is None:
                device_id = Device.DEFAULT_ID
            self.__device_id = device_id
        self._is_initialized = True

    def __repr__(self) -> str:
        dev_id = f":{self.device_id}" if self.device_type is ArrayDeviceType.CUDA else ""
        return f"{self.device_type.value}{dev_id}"

    def __reduce__(self):
        # Return a tuple representing the pickling state
        return self.__class__, (self.__device_type, self.__device_id)

    def __new__(cls, device_type: ArrayDeviceType, device_id: Optional[int] = None):
        device_id = device_id if device_type is ArrayDeviceType.CUDA else None
        if device_type is ArrayDeviceType.CUDA and device_id is None:
            device_id = cls.DEFAULT_ID

        key = (device_type, device_id)
        if key not in cls.__instances:
            inst = super().__new__(cls)
            cls.__instances[key] = inst
        return cls.__instances[key]

    @classmethod
    def parse_input(cls, device: str | int) -> Tuple[ArrayDeviceType, Optional[int]]:
        assert device is not None, f"device must not be None"
        if isinstance(device, int):
            return ArrayDeviceType.CUDA, device

        assert isinstance(device, str), f"device must either be int (GPU:device) or str (cpu|cuda)[:device]"
        regex = r'^(cpu|cuda)(:(\d+))?$'
        match = re.match(regex, device)

        assert match is not None and len(match.groups()) == 3, f"Unexpected input format: {device}"
        groups = match.groups()

        if groups[0] == cls.DEVICE_CPU:
            # Handle the "cpu" case
            return ArrayDeviceType.CPU, None
        elif groups[0] == cls.DEVICE_CUDA and groups[2] is None:
            return ArrayDeviceType.CUDA, cls.DEFAULT_ID
        elif groups[0] == cls.DEVICE_CUDA and groups[2] is not None:
            device_id = int(groups[2])
            return ArrayDeviceType.CUDA, device_id
        raise ValueError(f"Unexpected input format: {device}")

    @classmethod
    def build(cls, device: str | int):
        device_type, device_id = cls.parse_input(device)
        return cls(device_type, device_id)


class ArrayAdapter(Callable):

    func_map: Mapping[Callable, Callable]
    input_device: Optional[str | Device]
    output_device: Optional[str | Device]
    contingent_device: Device

    id: int

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
    def to_cupy(arr: TYPE_ARRAY | Number, device: Device, copy: bool = False) -> TYPE_CP:
        assert isinstance(arr, Number) or (ArrayAdapter.is_array(arr) and cupy_installed()), \
            f"arr must be array and cupy must be installed. {type(arr)}, {cupy_installed()}"
        assert device is not None and isinstance(device, Device) and device.is_cuda(), f"{device} is not CUDA device"
        with cp.cuda.Device(device.device_id):
            return cp.array(arr, copy=copy)

    @staticmethod
    def array_device_type(arr: TYPE_ARRAY) -> Device:
        on_cpu = ArrayAdapter.is_numpy(arr)
        if on_cpu:
            return Device.build(Device.DEVICE_CPU)
        assert cupy_installed() and ArrayAdapter.is_cupy(arr)
        return Device.build(f"{Device.DEVICE_CUDA}:{arr.device.id}")

    @staticmethod
    def is_array(arr: TYPE_ARRAY) -> bool:
        return ArrayAdapter.is_numpy(arr) or ArrayAdapter.is_cupy(arr)

    @classmethod
    def new_array(cls, arr: Any, array_device: Device) -> TYPE_ARRAY:
        if cls.is_array(arr):
            return cls._move_to_device(arr, array_device, copy=True)
        if isinstance(arr, Iterable):
            arr = cls.curate_arrays_device(*arr, device=array_device, copy=True)
        if array_device.is_cuda():
            assert cupy_installed()
            with cp.cuda.Device(array_device.device_id):
                return cp.asarray(arr)
        elif array_device.DEVICE_CPU:
            return np.asarray(arr)
        raise TypeError(f'Unexpected device {ArrayDeviceType}')

    def asarray(self, arr: Any) -> TYPE_ARRAY:
        return self.__class__.new_array(arr, self.output_device)

    @classmethod
    def _move_to_device(cls,
                        arr: Optional[TYPE_ARRAY],
                        device: Optional[Device], copy: bool = False) -> TYPE_ARRAY:
        # structural match > py3.10
        if device is None or not cls.is_array(arr):
            return arr
        assert device is not None
        if device.is_cpu():
            return ArrayAdapter.to_numpy(arr, copy=copy)
        elif device.is_cuda():
            return ArrayAdapter.to_cupy(arr, device, copy=copy)
        raise ValueError(f"Unsupported device: {device}")

    def sync(self, arr: Optional[TYPE_ARRAY | Number], copy: bool = False) -> TYPE_ARRAY:
        if not self.__class__.is_array(arr):
            return arr
        return self.__class__._move_to_device(arr, device=self.output_device, copy=copy)

    @classmethod
    def curate_device_helper(cls, arr: TYPE_ARRAY, device: Optional[Device], copy: bool):
        if arr is not None and cls.is_array(arr):
            arr = cls._move_to_device(arr, device, copy=copy)
        return arr

    @classmethod
    def curate_arrays_device(cls, *arrays: TYPE_ARRAY,
                             device: Optional[Device],
                             copy: bool = False) -> TYPE_ARRAY | Tuple[TYPE_ARRAY, ...]:
        """Curate the device type of one or more arrays.

        Args:
            *arrays:
            device:
            copy:

        Returns:

        """
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
                func_map: Mapping[Callable, Callable],
                device: Optional[Device]) -> Tuple[Callable, Device]:
        if device is None:
            logging.warning(f"Device unspecified in both input data and input device. Try: gpu:0")
            device = Device.build(Device.DEVICE_CUDA)
        if device.is_cpu():
            return cpu_func, device
        assert device.is_cuda()
        mapped = func_map.get(cpu_func, None)
        if mapped is not None:
            return mapped, device
        # if not implemented
        func_name = getattr(cpu_func, '__qualname__', cpu_func.__name__)
        logging.info(f"{__name__}: {func_name} does not have a GPU implementation. Revert to CPU")
        return cpu_func, Device.build(Device.DEVICE_CPU)

    @classmethod
    def call_helper(cls, func_in: Optional[TYPE_ARRAY], func_device: Device, func: Callable, *curated_args,
                    **curated_kwargs):
        if cls.is_cupy(func_in) or (func_in is None and func_device.is_cuda()):
            assert func_in is None or func_in.device.id == func_device.device_id, \
                f"{func_device} mismatch {func_in is None or func_in.device}"
            with cp.cuda.Device(func_device.device_id):
                return func(func_in, *curated_args, **curated_kwargs)
        else:
            return func(func_in, *curated_args, **curated_kwargs)

    @classmethod
    def unified_call(cls,
                     cpu_func: Callable,
                     func_map: Mapping[Callable, Callable],
                     input_device: Optional[Device],
                     output_device: Optional[Device],
                     data: TYPE_ARRAY, *args, **kwargs) -> TYPE_ARRAY:
        # use input_device to override the current device, if not None
        data = cls.curate_arrays_device(data, device=input_device, copy=False)
        # if data is None --> use input device.
        # if input_device is None, by default will invoke GPU interface
        input_type = cls.array_device_type(data) if data is not None else input_device
        # attempt to fetch the op, revert to CPU if GPU impl is not available (func=GPU impl, func_device=cuda
        func, func_device = cls.get_api(cpu_func, func_map, input_type)
        func_in: TYPE_ARRAY = cls.curate_arrays_device(data, device=func_device, copy=True)

        curated_args = cls.curate_arrays_device(*args, device=func_device, copy=True)
        curated_kwargs = dict()
        for k, v in kwargs.items():
            curated_kwargs[k] = cls.curate_arrays_device(v, device=func_device, copy=True)

        output = cls.call_helper(func_in, func_device, func, *curated_args, **curated_kwargs)
        # only move the output around if the output is an array
        if isinstance(output, tuple):
            return cls.curate_arrays_device(*output, device=output_device, copy=True)
        return cls.curate_arrays_device(output, device=output_device, copy=True)

    @classmethod
    def _validate_device(cls, device: Optional[Device | str | int]) -> Optional[Device]:
        if device is None:
            return None
        if isinstance(device, (str, int)):
            device = Device.build(device)

        assert isinstance(device, Device), f"{type(device)}"

        if device.is_cpu():
            return device

        assert device.is_cuda(), f"Unsupported device_type: {device}"
        if not cupy_installed():
            logging.info(f"Cupy is not installed. Revert to CPU")
            return Device.build(Device.DEVICE_CPU)
        return device

    def __init__(self,
                 input_device: Optional[str | int | Device],
                 output_device: Optional[str | int | Device],
                 func_map: Mapping[Callable, Callable],
                 contingent_device: Device,
                 ):
        self.input_device = self.__class__._validate_device(input_device)
        self.output_device = self.__class__._validate_device(output_device)
        self.func_map = func_map
        self.contingent_device = contingent_device

    @classmethod
    def build(cls,
              input_device: Optional[str | int | Device],
              output_device: Optional[str | int | Device],
              func_map: Mapping[Callable, Callable] = FUNC_MAP,
              contingent_device: Device = None) -> Self:
        if contingent_device is None:
            contingent_device = output_device
        return cls(input_device=input_device, output_device=output_device, func_map=func_map,
                   contingent_device=contingent_device)

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
                               array_device: Optional[Device],
                               contingent_device: Optional[Device]) -> TYPE_ARRAY | Tuple[TYPE_ARRAY, ...]:
        assert isinstance(arrays, tuple), f"input check. {type(arrays)} is not a tuple"
        if array_device is not None:
            return cls.__sync_device_output_helper(tuple(cls._move_to_device(arr, array_device) for arr in arrays))
        assert array_device is None
        has_contingent_device = any(cls.array_device_type(arr) is contingent_device for arr in arrays)
        if has_contingent_device:
            assert contingent_device is not None
            return cls.__sync_device_output_helper(cls.device_sync_all_helper(*arrays,
                                                                              array_device=contingent_device,
                                                                              contingent_device=None))
        return cls.__sync_device_output_helper(arrays)

    def device_sync_all(self, *arrays: TYPE_ARRAY) -> TYPE_ARRAY | Tuple[TYPE_ARRAY, ...]:
        """Synchronize the device of all arrays to be

        Args:
            *arrays:

        Returns:

        """
        return self.__class__.device_sync_all_helper(*arrays, array_device=self.output_device,
                                                     contingent_device=self.contingent_device)

    @classmethod
    def binary_operation(cls, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY,
                         input_device: Optional[Device],
                         output_device: Optional[Device],
                         contingent_device: Optional[Device],
                         op: Callable) -> TYPE_ARRAY:
        arr1, arr2 = cls.device_sync_all_helper(arr1, arr2, array_device=input_device,
                                                contingent_device=contingent_device)
        result: TYPE_ARRAY = op(arr1, arr2)
        return cls.curate_arrays_device(result, device=output_device, copy=True)

    def and_(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_device=self.contingent_device,
                                               op=and_)

    def or_(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_device=self.contingent_device,
                                               op=or_)

    def add(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_device=self.contingent_device,
                                               op=add)

    def sub(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_device=self.contingent_device,
                                               op=sub)

    def mul(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_device=self.contingent_device,
                                               op=mul)

    def matmul(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_device=self.contingent_device,
                                               op=matmul)

    def truediv(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_device=self.contingent_device,
                                               op=truediv)

    def floordiv(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_device=self.contingent_device,
                                               op=floordiv)

    def xor(self, arr1: TYPE_ARRAY, arr2: TYPE_ARRAY) -> TYPE_ARRAY:
        return self.__class__.binary_operation(arr1, arr2, input_device=self.input_device,
                                               output_device=self.output_device,
                                               contingent_device=self.contingent_device,
                                               op=xor)

    @classmethod
    def imsave(cls, filename: str, arr: TYPE_ARRAY, **kwargs):
        logging.debug(f"{__name__}: SHAPE DBG {arr.shape}")
        arr = cls.curate_arrays_device(arr, device=Device.build(Device.DEVICE_CPU), copy=True)
        logging.debug(f"{__name__}: TYPE DBG {type(arr)}")
        return skimage.io.imsave(filename, arr, **kwargs)
