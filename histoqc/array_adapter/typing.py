from __future__ import annotations
import numpy as np
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    # for forward reference only -- annotate the objects from the optional cupy dependency
    # noinspection PyUnresolvedReferences
    import cupy as cp


TYPE_NP = np.ndarray
TYPE_CP = "cp.ndarray"
TYPE_ARRAY = "np.ndarray | cp.ndarray"
