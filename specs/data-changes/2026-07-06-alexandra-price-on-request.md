# Data change — Alexandra Constantin → Price-on-request

**Date:** 2026-07-06
**Environment:** Production (`vernis9.art`, DB `artverse_production`)
**Operator:** manual SQL via `docker exec artverse-production-db-1 psql`
**Artist:** Alexandra Constantin (`c62bba40-4de3-4118-8e4a-2d9b65fbfb45`)

## What changed

All artworks that were **for sale** and had a **real (non-zero) price** were switched to
Price-on-request: `price` set to `NULL`, `price_on_request` set to `true`. **22 works** affected.

Works **not for sale** were left untouched (17 priced at 0.00 + 3 withdrawn priced works).
The 2 works already on Price-on-request (`Strong`, `The View`) were already correct.

### SQL applied

```sql
UPDATE artworks
SET price = NULL, price_on_request = true
WHERE artist_id = 'c62bba40-4de3-4118-8e4a-2d9b65fbfb45'
  AND is_for_sale = true
  AND price_on_request = false
  AND price IS NOT NULL
  AND price > 0;
-- UPDATE 22
```

## Original prices (restore reference)

The `price` values below were nulled out by this change. To restore a work, set its
`price` back to the value here and `price_on_request = false`.

| Artwork ID | Title | Original price (EUR) |
|---|---|---|
| e3c44c9d-e6f4-445d-96ea-43c3080208de | After rain | 100.00 |
| 0a85c05b-b3d7-44a4-90f6-c2fcee19f93d | City at sunset | 100.00 |
| 251f54de-55be-4490-b20f-16d30663cd27 | Dance | 1100.00 |
| 916fcfa2-2be9-4a6a-9c0f-9bd1af6b7b02 | Dark side 1 | 100.00 |
| ef43db7e-0f83-44b6-a6f8-b078fc7cc4de | Dark side 2 | 100.00 |
| 2f38d3a9-9835-46f4-934f-a73fc97d854d | Disappointment | 800.00 |
| ccd2e7ee-ffc6-47e7-8f8b-e007b098221b | Harmony | 800.00 |
| a68daa8e-9768-4ef6-b4e9-d8d84e573119 | Light 1 | 100.00 |
| 35f46ee2-ae36-4b89-8199-2b1b96411a03 | Light 2 | 100.00 |
| de2546c8-8456-4d4c-b325-488b18bc32ba | Light in the forrest | 100.00 |
| 294efd8b-8dde-4e08-8a77-b9416a9ccd64 | Morning in the forrest | 100.00 |
| 42029d98-922d-4016-aa4f-e70bb47421d2 | Night | 1300.00 |
| 7ca8861b-ce7c-4a34-af9a-dde22db8bf5e | River in the morning | 100.00 |
| 93642d3d-beb7-4275-94be-be70cebb6b4b | Sadness | 100.00 |
| 73418757-ee1f-47ba-90ad-248a2a7c9e4c | Storm | 1000.00 |
| 29205334-db5c-47dd-aae1-8c58d82a063b | Summer | 1100.00 |
| fc3187a7-d4cd-47af-a118-f9cf489ad168 | Summer | 100.00 |
| 7c2af48c-cee3-48d7-9cc1-37e1384c35b2 | Sunset | 100.00 |
| d67cdce7-e60f-402b-8088-32e87031ef8c | Sunset on water | 100.00 |
| 175a667a-e37a-4a10-bb39-aa40f989a231 | Time | 1300.00 |
| e016cabb-afa4-479a-9243-3b0a77472553 | Untitled | 2000.00 |
| 97468254-2df9-4f81-914f-e180fdffcbc7 | Watched | 100.00 |

### Not changed — priced but not for sale (left as-is)

| Artwork ID | Title | Price (EUR) |
|---|---|---|
| 2e4b5803-8385-4102-bcb0-56a175a626ae | Beginning | 2000.00 |
| 6fb9790b-21f7-487f-9e1c-5ea94e044f8f | Life | 2000.00 |
| 8b6e65c7-6d8e-4955-8b44-1f274b04b15c | Wild | 1200.00 |
