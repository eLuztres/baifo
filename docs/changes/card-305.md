# Card #305: Admin pencil on every listing page

## What changed

- **New `components/shared/admin-edit-button.tsx`:** a round floating pencil, the same size and style as the admin "+" (`admin-add-button.tsx`). It links to the listing's editor `/admin/listings/<submissionId>`. Old shop products without a marketplace listing link to `/admin/products/<productId>` instead.
- **Admins only:** the server checks the session role with `isAdmin()`, like the "+". Visitors get nothing in the HTML.
- **Placement:** on desktop the pencil sits stacked above the "+". On phones (< 640px) it sits to the left of the "+", and the product page (`product-view.module.css`) gets 4rem less height when the pencil is there, so both buttons have their own strip and cover neither the description nor the Contact button.
- **`getProductBySlug`** now also selects the listing's `submission.id`.
- **Page fade-in (`page-transition.module.css`):** the animation fill mode is `backwards` instead of `both`. A `translate` kept after the animation ended made the page a containing block, so `position: fixed` buttons inside it stuck to the page instead of the screen. The animation looks the same; this affects every page.
- **i18n:** `ADMIN_EDIT_LISTING` ("Edit listing") in all 5 languages, used as label and tooltip.
- **Test:** `tests/components/admin-edit-button.test.tsx` covers visitor (nothing), listing editor link and the old-product fallback.

## Why

Editing a listing meant going through `/admin/listings` and searching for it. Now the admin fixes it from the listing page in one tap.

## How to test by hand

1. Log in as admin and open any listing (`/product/<slug>`): the pencil sits above the "+" bottom right. Tap it: the listing's editor opens.
2. Open an old shop product that has no listing: the pencil opens `/admin/products/<id>`.
3. At 375px and 320px: the pencil is left of the "+", both sit below the page, and the Contact button and description are not covered. Check light and dark.
4. Log out and open the same page: no pencil.
5. Navigate between a few pages: the fade-in still plays.
