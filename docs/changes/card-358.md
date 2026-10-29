# Card 358: Product form: store categories as a dropdown

## What changed

- **"Categories in the store"** on the admin product form (`components/admin/product-form.tsx`, create and edit) is no longer a wall of checkboxes. It is one full-width dropdown button.
- **The button** shows the chosen categories, separated by commas and cut off with "…" when too long. With nothing chosen it shows "None chosen" (`PRODUCT_FORM_STORE_CATEGORIES_NONE`, in all five languages).
- **The list** opens at the button's width, shows every category with a check mark and scrolls when it's long. Checking an item keeps the list open, so several can be checked in a row.
- Saving is unchanged: the same `categoryIds` value and `toggleCategory` are used. The field still hides when the shop has no store categories.

## Why

With 20+ store categories the checkbox block took a lot of space on the form, especially on phones.

## Review (testing stage)

- No problems found. The existing test (`tests/components/product-form-store-categories.test.tsx`) covers picking, keeping the menu open and unpicking.

## How to check

1. Open `/admin/products/create`. "Categories in the store" shows "None chosen".
2. Open it and check three categories: the list stays open and the button lists the names.
3. Close it with Esc or a click outside. Open again and uncheck one: its name leaves the button.
4. Save the product, then open it again under `/admin/products/<id>`: the same categories are chosen.
5. At 375 and 320 px: the button fits, long choices end in "…" and the list scrolls without running off the screen.
