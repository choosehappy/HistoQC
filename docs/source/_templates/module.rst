{{ fullname | escape | underline }}

.. currentmodule:: {{ fullname }}

{% if functions %}
.. rubric:: Functions

.. autosummary::
   :nosignatures:
{% for item in functions %}
   {{ item }}
{%- endfor %}
{% endif %}

.. automodule:: {{ fullname }}
   :members: