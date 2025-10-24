# Challenge #1 - fetchAllRecords

Welcome to Challenge 1. Your goal is to implement fetching and listing product data using `manta.fetchAllRecords()`.

## Starter repo

Branch: `challenge-1`

## Setup Instructions

### 1. Clone the starter repo

```bash
git clone https://github.com/mantahq/sdk-challenges
cd sdk-challenges
git checkout challenge-1
npm install
```

### 2. Add your API key

Create `.env` file:

```
VITE_MANTAHQ_API_KEY=your_key_here
```

### 3. Create your database table in MantaHQ Studio

**Table name:** `products`

| Field       | Type   | Required |
| ----------- | ------ | -------- |
| product_id  | string | Yes      |
| name        | string | Yes      |
| category    | string | Yes      |
| price       | number | Yes      |
| stock       | number | Yes      |
| description | string | No       |
| image_url   | string | No       |

### 4. Add sample data

Use the `products.csv` file in the repo to populate your table (20-30 products). You can either:

- Import via MantaHQ Studio.

## Your Task

The UI is already built. Your job is to implement the SDK calls in `src/components/FetchAllRecords.jsx` in the `challenge-1` branch.

Look for all the `// TODO:` comments and implement them.

## SDK Documentation

Check the docs for `fetchAllRecords()`:
[MantaHQ Docs - fetchAllRecords()](https://mantahq-core-sdk.super.site/fetching-data/fetchallrecords)

**Key things you'll use:**

- `table` - Your table name
- `where` - Filter conditions
- `search` - Keyword search
- `page` & `list` - Pagination
- `orderBy` & `order` - Sorting

## Definition of Done

Your app should:

- ✅ Display products in a grid (4 or 6 per page)
- ✅ Filter by category dropdown
- ✅ Search by product name
- ✅ Sort by price (low→high, high→low)
- ✅ Navigate between pages
- ✅ Show loading states (UI has been implemented)
- ✅ **BONUS:** Handle errors gracefully

## Test These Scenarios

1. Browse all products (no filters)
2. Filter by "electronics" category
3. Search for "mouse"
4. Combine category + price filters
5. Sort by price ascending/descending
6. Navigate to page 2, then apply filters
7. Navigate to page 2, then back to page 1

## Feedback

When done, fill out the Challenge 1 feedback form: [Challenge 1 Feedback Form](https://docs.google.com/forms/d/e/1FAIpQLSc_5paJinXTq8zLtv10lVWuEFcWdjuyF8ywrIjQKa0S3F6bEQ/viewform?usp=send_form)

## Need Help?

- Check the README in the repo
- Read the SDK docs
- Join our Discord server: [https://discord.gg/taH3JfVEMh](https://discord.gg/taH3JfVEMh)

## What's Next?

**Branch for challenge 2:** `challenge-2`

**Good luck! Take your time and explore. This is your chance to help shape the SDK.**

```
P.S. The UI styling is done with Tailwind. Focus on the SDK implementation, not styling.
```
