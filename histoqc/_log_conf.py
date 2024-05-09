from typing_extensions import TypedDict, NotRequired, Literal, Self
from typing import Dict, Type, Callable, Any, List, Optional, Sequence, get_args, cast
import logging.config

FormattersDict = TypedDict('FormattersDict', {
    'format': str,
    'datefmt': str,
    'style': str,
    'validate': str,
    'defaults': str,
    'class': NotRequired[str],

}, total=False)

FilterDict = TypedDict("FilterDict", {
    '()': Type[logging.Filter] | Callable,
    'args': NotRequired[Any],
})

HandlerDict = TypedDict("HandlerDict", {
    "class": str,
    "level": NotRequired[str],
    "formatter": NotRequired[str],
    "filters": NotRequired[List[str | logging.Filter]],
    "filename": NotRequired[str],
    "stream": NotRequired[str],
    "mode": NotRequired[str],
})


class LoggerDict(TypedDict, total=False):
    level: str
    propagate: bool
    filters: List[str | logging.Filter]
    handlers: List[str]


class ConfigDict(TypedDict):

    version: int
    formatters: NotRequired[Dict[str, FormattersDict]]
    filters: NotRequired[Dict[str, FilterDict]]
    handlers: NotRequired[Dict[str, HandlerDict]]
    loggers: NotRequired[Dict[str, LoggerDict]]
    root: NotRequired[LoggerDict]
    incremental: NotRequired[bool]  # default False
    disable_existing_loggers: NotRequired[bool]  # default True


DEFAULT_CONSOLE = Literal['console']
DEFAULT_FILE = Literal['file']
TYPE_PREDEFINED_HANDLER = Literal[DEFAULT_CONSOLE, DEFAULT_FILE]

DEFAULT_STD_OUT: str = 'ext://sys.stdout'
DEFAULT_LOG_FN: str = 'error.log'
DEFAULT_HANDLER_OUT_MAP: Dict[TYPE_PREDEFINED_HANDLER, str] = {
    get_args(DEFAULT_CONSOLE)[0]: DEFAULT_STD_OUT,
    get_args(DEFAULT_FILE)[0]: DEFAULT_LOG_FN,
}

TYPE_FORMAT_DEFAULT = Literal['default']
TYPE_FORMAT_SIMPLE = Literal['simple']
TYPE_PREDEFINED_FORMATTER = Literal[TYPE_FORMAT_DEFAULT, TYPE_FORMAT_SIMPLE]

PREDEFINED_FORMATTER_MAP: Dict[TYPE_PREDEFINED_FORMATTER, FormattersDict] = {
    get_args(TYPE_FORMAT_DEFAULT)[0]: {
        'class': 'logging.Formatter',
        'format': '%(asctime)s - %(levelname)s - %(message)s'
    },
    get_args(TYPE_FORMAT_SIMPLE)[0]: {
        'class': 'logging.Formatter',
        'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    }
}

LEVEL_DEBUG = Literal['DEBUG']
LEVEL_INFO = Literal['INFO']
LEVEL_WARNING = Literal['WARNING']
LEVEL_ERROR = Literal['ERROR']
LEVEL_CRITICAL = Literal['CRITICAL']
LEVEL_NOTSET = Literal['NOTSET']
LEVEL_TYPE = Literal[LEVEL_NOTSET, LEVEL_CRITICAL, LEVEL_ERROR, LEVEL_WARNING, LEVEL_INFO, LEVEL_DEBUG]


def default_init_helper(d: Dict, key: str, factory: Callable) -> Any:
    if key in d:
        return
    d[key] = factory()


def init(attr: str, key: str, factory: Callable) -> Callable:
    def decorator(func):
        def wrapped(self, *args, **kwargs):
            # Execute the helper function with self.some_attr, b, c
            default_init_helper(getattr(self, attr), key, factory)
            # Then execute the original function
            return func(self, *args, **kwargs)
        return wrapped
    return decorator


class LoggerConfigBuilder:
    """Builder to create log conf schema.

    Examples:
        config_builder = LoggerConfigBuilder(version=1)
        config = (config_builder
              .add_formatter_by_type(formatter_type='simple')
              .add_handler_by_type(handler_type='console', level='DEBUG', formatter_type='simple')
              .add_handler_by_type(handler_type='logfile', level='ERROR', formatter_type='simple')
              .add_logger(name='myapp', level='DEBUG', handlers=['console', 'logfile'])
              .config)
    """

    def __init__(self, version: int):
        self._config = ConfigDict(version=version, )

    @staticmethod
    def get_predefined_formatter(formatter_type) -> FormattersDict:
        if formatter_type not in PREDEFINED_FORMATTER_MAP:
            raise ValueError(f'Unknown predefined formatter: {formatter_type}')
        return PREDEFINED_FORMATTER_MAP[formatter_type]

    @staticmethod
    def get_predefined_handler(handler_type: TYPE_PREDEFINED_HANDLER,
                               level: LEVEL_TYPE = 'DEBUG',
                               formatter: str = 'simple',
                               target: Optional[str] = None,
                               mode: str = 'w') -> HandlerDict:
        target = target if target is not None else DEFAULT_HANDLER_OUT_MAP[handler_type]
        if handler_type == get_args(DEFAULT_CONSOLE)[0]:
            return {
                'class': 'logging.StreamHandler',
                'level': level,
                'formatter': formatter,
                'stream': target
            }
        elif handler_type == get_args(DEFAULT_FILE)[0]:
            return {
                'class': 'logging.FileHandler',
                'level': level,
                'formatter': formatter,
                'filename': 'app.log',
                'mode': mode,
            }
        raise ValueError(f'Unknown pre-defined handler type: {handler_type}')

    @staticmethod
    def create_logger(*, level: LEVEL_TYPE = 'DEBUG', handlers: List[str] = ('console', ),
                      propagate: bool = False,
                      filters: Optional[List[str | logging.Filter]] = None) -> LoggerDict:
        if filters is None:
            filters = []
        return LoggerDict(level=level, handlers=handlers, propagate=propagate, filters=filters)

    @init("config", 'formatters', dict)
    def add_formatter_by_type(self, *, formatter_type: TYPE_PREDEFINED_FORMATTER):
        # default_init(self.config, 'formatters', dict)
        self._config['formatters'][formatter_type] = self.get_predefined_formatter(formatter_type)
        return self

    @init("config", 'formatters', dict)
    def add_formatter(self, *, name: str, formatter_dict: FormattersDict):
        # default_init(self.config, 'formatters', dict)
        self._config['formatters'][name] = formatter_dict
        return self

    @init("config", 'handlers', dict)
    def add_handler(self, *, name: str, handler_dict: HandlerDict):
        self._config['handlers'][name] = handler_dict
        return self

    @init("config", 'handlers', dict)
    def add_handler_by_type(self, *, handler_type: TYPE_PREDEFINED_HANDLER, level: LEVEL_TYPE,
                            formatter: str):
        self._config['handlers'][handler_type] = self.get_predefined_handler(handler_type, level, formatter)
        return self

    @init("config", 'loggers', dict)
    def add_logger(self, *, name: str, level: LEVEL_TYPE, handlers: List[str], propagate: bool = False,
                   filters: Optional[Sequence[str | logging.Filter]] = None) -> Self:
        self._config['loggers'][name] = self.create_logger(level=level, handlers=handlers,
                                                           propagate=propagate,
                                                           filters=filters)
        return self

    @init("config", 'root', dict)
    def add_root(self, *, level: LEVEL_TYPE, handlers: List[str], propagate: bool = False,
                 filters: Optional[Sequence[str | logging.Filter]] = None) -> Self:
        self._config['root'] = self.create_logger(level=level, handlers=handlers,
                                                  propagate=propagate,
                                                  filters=filters)
        return self

    @init("config", 'handlers', dict)
    def set_handler_target(self, handler_name: str, out_field: str, out_value: str):
        assert handler_name in self.config['handlers']
        handler_dict: HandlerDict = self.config['handlers'][handler_name]
        out_field = cast(Literal['filename'], out_field)
        handler_dict[out_field] = out_value
        return self

    @property
    def config(self):
        return self._config
