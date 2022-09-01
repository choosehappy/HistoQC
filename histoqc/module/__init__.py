from abc import abstractmethod, ABC
from typing import Callable, Dict, Any, Tuple, ClassVar
from histoqc.image_core.BaseImage import BaseImage, ATTR_TYPE
import logging


class QCModule(Callable):

    SHARED_DICT: str = 'shared_dict'
    LOCK: str = 'lock'

    _params_config: ClassVar[Dict[str, Tuple[bool, Any]]] = None
    _preserved_config: ClassVar[Dict[str, Tuple[bool, Any]]] = {
        SHARED_DICT: (False, None),
        LOCK: (False, None)
    }

    _params: Dict[ATTR_TYPE, Any]

    @staticmethod
    @abstractmethod
    def _default_config():
        raise NotImplementedError

    @abstractmethod
    def __call__(self, s: BaseImage):
        raise NotImplementedError

    @staticmethod
    def _merged_default_config(cls):
        defaults = cls._default_config()
        preserved = QCModule._preserved_config
        assert preserved.keys().isdisjoint(defaults.keys()), \
            f"Kwarg name conflicts. {preserved.keys()} vs. {defaults.keys()}"
        return {**defaults, **preserved}

    # class property is only available in python 3.9
    @classmethod
    def params_config(cls):
        if not hasattr(cls, "_params_config") or cls._params_config is None:
            cls._params_config = cls._merged_default_config()
        return cls._params_config


    @classmethod
    def __param_validate_mandatory(cls,
                                   merged_config: Dict[str, Tuple[bool, Any]],
                                   input_params: Dict[str, Any]):
        undefined_mand_paramd = [keyword for keyword, (mand, default_val) in merged_config.items()
                                 if keyword not in input_params.keys() and mand]
        assert len(undefined_mand_paramd) == 0, f"{cls.__name__}: " \
                                                f"Undefined Mandatory Params: {undefined_mand_paramd}"

    @classmethod
    def parsed_kwargs(cls,
                      merged_config: Dict[str, Tuple[bool, Any]],
                      input_params: Dict[str, Any]) -> Dict[str, Any]:
        """Parse the incoming dict of kwargs. Assigning default values if possible
        Args:
            merged_config:
            input_params:

        Returns:

        """
        set_config_kws = set(merged_config.keys())
        set_params_kws = set(input_params.keys())
        # disjoint keywords: throw the error
        assert not set_config_kws.isdisjoint(set_params_kws), f"{cls.__name__}: Incompatible Keywords." \
                                                              f" Expect a subset of" \
                                                              f" {set_config_kws}. Got {set_params_kws}"

        # warning: in input params but not in default configs
        diff = set_params_kws - set_config_kws
        if len(diff) > 0:
            logging.warning(f"{cls.__name__}: Unexpected Params: {diff}")

        # check default or mandatory
        cls.__param_validate_mandatory(merged_config, input_params)
        parsed_params_dict = {k: v if k not in input_params.keys() else input_params[k]
                              for k, v in merged_config.items()}
        return parsed_params_dict

    @classmethod
    def build(cls, input_params: Dict[str, Any]):
        return cls(**input_params)

    def __assign_param_attributes(self, parsed_params:  Dict[str, Any]):
        for keyword, value in parsed_params.items():
            if hasattr(self, keyword):
                logging.warning(f"{self.__class__.__name__}: Params already set in class definition:"
                                f"{keyword} in {parsed_params}")
            setattr(self, keyword, value)

    def __init__(self, **input_params):
        cls = self.__class__
        parsed_params = self.__class__.parsed_kwargs(cls.params_config(), input_params)
        self.__assign_param_attributes(parsed_params)



