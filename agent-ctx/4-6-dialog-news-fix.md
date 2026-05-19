# Task 4 & 6: Dialog Title Fix + News Form Edit Data Loading

## Agent: Dialog & News Fix Agent

## Task 4: Fix Dialog components missing DialogTitle

### Result: All Dialog components already have DialogTitle — no changes needed

Checked all 8 files:
1. **tags-page.tsx** — ✅ Create/Edit Dialog has DialogTitle; Delete AlertDialog has AlertDialogTitle
2. **reporters-page.tsx** — ✅ Dialog has DialogTitle
3. **notifications-page.tsx** — ✅ Dialog has DialogTitle
4. **settings-page.tsx** — ✅ No Dialog components (uses cards)
5. **locations-page.tsx** — ✅ Both State and District Dialogs have DialogTitle
6. **users-page.tsx** — ✅ View/Edit Dialogs have DialogTitle; Delete AlertDialog has AlertDialogTitle
7. **admins-page.tsx** — ✅ Create/Edit Dialogs have DialogTitle; Delete AlertDialog has AlertDialogTitle
8. **categories-page.tsx** — ✅ Dialog has DialogTitle

## Task 6: Fix news form - improve edit data loading

### Changes made to `/home/z/my-project/src/components/admin/news-page.tsx`:

1. Added `State` interface with `{ id, name, code }` and updated `District` interface to include `stateId`
2. Added `states` state and loading in parent `NewsPage` component
3. Added `stateId: ''` to form initial state
4. Added State dropdown (required field) in the NewsFormPage sidebar
5. Districts now filter by selected state
6. State changes reset the districtId to avoid invalid district-state combinations
7. Made tag ID extraction robust on edit with proper null handling and type guards
8. Fixed imagesUrls loading to use `Array.isArray()` check
9. Added stateId validation in form submit
10. Fixed tag key in list view from `t.slug` to `t.tag.slug`

### Lint: Passes cleanly
