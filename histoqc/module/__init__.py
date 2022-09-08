from abc import abstractmethod, ABC
from typing import Callable, Dict, Any, Tuple, ClassVar
from histoqc.image_core.BaseImage import BaseImage, ATTR_TYPE
import logging


# todo - base class for all future modules
class QCModule(Callable):

    # mandatory flag -- Enum enabled in Python 3.10
    MANDATORY: bool = True
    OPTIONAL: bool = False

    # whether the parameter is designed to override the attributes of BaseImage. If so, then undefined value
    # means using the original BaseImage inputs
    # alternatively speaking, it is more natural to say that this parameter is instead overridden by the baseimage attrs
    OVERRIDDEN_BY_INPUT_IF_NONE: bool = True
    NO_OVERRIDE: bool = False

    SHARED_DICT: str = 'shared_dict'
    LOCK: str = 'lock'

    _params_config: Dict[str, Tuple[bool, bool, Any]] = None
    _preserved_config: ClassVar[Dict[str, Tuple[bool, bool, Any]]] = {
        SHARED_DICT: (OPTIONAL, NO_OVERRIDE, None),
        LOCK: (OPTIONAL, NO_OVERRIDE, None)
    }

    _params: Dict[str, Any]

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
    @property
    def params_config(self):
        if not hasattr(self, "_params_config") or self._params_config is None:
            self._params_config = self._merged_default_config()
        return self._params_config

    @classmethod
    def __param_validate_mandatory(cls,
                                   merged_config: Dict[str, Tuple[bool, bool, Any]],
                                   input_params: Dict[str, Any]):
        undefined_mand_paramd = [keyword for keyword, (mand, _, _) in merged_config.items()
                                 if keyword not in input_params.keys() and mand == cls.MANDATORY]
        assert len(undefined_mand_paramd) == 0, f"{cls.__name__}: " \
                                                f"Undefined Mandatory Params: {undefined_mand_paramd}"

    @classmethod
    def parsed_kwargs(cls,
                      merged_config: Dict[str, Tuple[bool, bool, Any]],
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
        parsed_params_dict = {keyword: default_value if keyword not in input_params.keys() else input_params[keyword]
                              for keyword, (mand, override, default_value) in merged_config.items()}
        return parsed_params_dict

    @classmethod
    def build(cls, input_params: Dict[str, Any]):
        return cls(**input_params)

    # Since params is tightly coupled with BaseImage, wherein default values of certain attributes in the params
    # are fetched from the BaseImage, it is easier to keep the params as a dict as previous version.
    # Moreover, a params dict is also aligned with the param configuration dict.
    def __assign_param_attributes(self, parsed_params:  Dict[str, Any]):
        # for keyword, value in parsed_params.items():
        #     if hasattr(self, keyword):
        #         logging.warning(f"{self.__class__.__name__}: Params already set in class definition:"
        #                         f"{keyword} in {parsed_params}")
        #     setattr(self, keyword, value)
        self._params = parsed_params

    def __init__(self, **input_params):
        cls = self.__class__
        parsed_params = cls.parsed_kwargs(self.params_config, input_params)
        self.__assign_param_attributes(parsed_params)

    def _get_params_config(self, keyword: str):
        return self._params_config[keyword]

    def get_params_value(self, keyword: str, override_value=None):
        result = self._params.get(keyword, None)
        mand, overridden_by_input, _ = self._get_params_config(keyword)
        # if this parameter is only for overriding the baseimage attributes and it is not set, use baseimage attributes
        # instead
        if result is None and overridden_by_input:
            return override_value
        return result
