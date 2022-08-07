import numpy as np
from typing import Union


def working_mask(mask_in: Union[None, np.ndarray], invert: bool, limit_to_mask: bool) -> Union[None, np.ndarray]:
    assert (not limit_to_mask) or mask_in is not None, f"Either mask is defined, or limit_to_mask is" \
                                                       f" set to False{not limit_to_mask}. {mask_in is not None}"
    mask_to_use = mask_in if not invert else ~mask_in
    return mask_to_use if limit_to_mask else None
