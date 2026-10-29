# Card #305: Admin pencil on every listing page

## What changed

- **`components/shared/admin-edit-button.tsx`:** a small round pencil beside the listing's title, next to the Share button and in the same style. It links to the listing's editor `/admin/listings/<submissionId>`. Old shop products without a marketplace listing link to `/admin/products/<productId>` instead.
- **Admins only:** the server checks the session role with `isAdmin()`, like the "+". Visitors get nothing in the HTML.
- **No floating buttons on a listing page:** the pencil is in the page's normal flow, and the floating "+" (`admin-add-button.tsx`, marked `data-admin-add`) is hidden on listing pages by `product-view.module.css`. Photos, description and Contact keep the size a visitor sees.
- **`getProductBySlug`** also selects the listing's `submission.id`.
- **Page fade-in (`page-transition.module.css`):** the animation fill mode is `backwards` instead of `both`, so a leftover `translate` doesn't pin fixed elements inside a page to it. The animation looks the same.
- **i18n:** `ADMIN_EDIT_LISTING` ("Edit listing") in all 5 languages, used as label and tooltip.
- **Test:** `tests/components/admin-edit-button.test.tsx` covers visitor (nothing), listing editor link and the old-product fallback.

### After going live (Joe's feedback)

The first version was a floating pencil stacked above the "+", and on phones the listing page shrank to make room for both. That squeezed the description and the fixed buttons jumped around. Now the pencil sits beside the title and the "+" is hidden on listing pages.

## Why

Editing a listing meant going through `/admin/listings` and searching for it. Now the admin fixes it from the listing page in one tap, without the listing looking any different.

## How to test by hand

1. Log in as admin and open a product, a service and an event (`/product/<slug>`): a pencil sits beside the title, next to Share. No "+" floats over the page. Tap the pencil: the listing's editor opens.
2. Open an old shop product that has no listing: the pencil opens `/admin/products/<id>`.
3. At 375px and 320px: the photo, description and Contact button have the same size as for a visitor; nothing floats over them.
4. Log out and open the same pages: no pencil.
5. On other pages (home, listings) the admin "+" is still there.
