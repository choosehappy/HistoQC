from __future__ import annotations
import importlib
from typing import Optional, List


def __dynamic_import(module_name: str, attribute_name: Optional[str]):
    """Base function to import a module or a component from the module via importlib

    Args:
        module_name: name of the module
        attribute_name: name of the attribute. If None, then returns the module itself.

    Returns:
        imported module or component

    Raises
        ImportError: if the module cannot be imported or the attribute is not found.
    """
    assert module_name is not None and isinstance(module_name, str)
    module = importlib.import_module(module_name)
    if attribute_name is None:
        return module
    if not hasattr(module, attribute_name):
        raise ImportError(f"'{module_name}' has no attribute '{attribute_name}'")
    return getattr(module, attribute_name)


def __validate_names(names: str | List[str], pad_length: Optional[int] = 1) -> List[Optional[str]]:
    """Validate the names provided to be not None and in form of a list.

    If the names is a str, returns a list with a singleton value of names and length of pad_length.

    Args:
        names: the value to be validated
        pad_length: length to

    Returns:
        List of names.
    """
    if isinstance(names, str) or names is None:
        return [names] * pad_length
    if isinstance(names, list) and len(names) == 1 and pad_length > 1:
        return names * pad_length
    assert isinstance(names, List), f"{type(names)}"
    return names


def dynamic_import(module_names: List[str] | str,
                   attr_names: Optional[List[Optional[str]] | str],
                   return_first: bool):
    """Dynamically import the module or attribute from the modules via importlib.

    Priority is defined by the order of module_names/attr_names. The function will continue to try to import the module
    until all attempts fail and raise an ImportError in this case.
    If return_first is True, the function only returns the first viable module/attribute. Otherwise, it returns the list
    of all available modules/attributes.

    Args:
        module_names: names of the modules. If it is str it will be padded to a list of single element: [names]
        attr_names: names of the attributes. If None, then only the module is imported.
            If it is a str or a list of single element, it will be padded to a list of same values
            with same length as module_names.
        return_first: If return_first is True, the function only returns the first viable module/attribute.
    Returns:
        imported module or attribute

    Raises:
        ImportError: if the module cannot be imported or the attribute is not found.
    """
    module_names = __validate_names(module_names)
    attr_names = __validate_names(attr_names, pad_length=len(module_names))
    assert len(module_names) == len(attr_names)
    out_list = []
    for module, attr in zip(module_names, attr_names):
        try:
            result = __dynamic_import(module, attr)
            if return_first:
                return result
            out_list.append(result)
        except ImportError:
            continue
    if len(out_list) == 0:
        raise ImportError(f"Cannot Import from: {module_names}, {attr_names}")
    return out_list
