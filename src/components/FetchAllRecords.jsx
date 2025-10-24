import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { ErrorBoundary } from "react-error-boundary";
import MantaClient from "mantahq-sdk";

// =============================================================================
// CHALLENGE #1: Product Catalog with fetchAllRecords()
// =============================================================================
// YOUR TASKS:
// 1. Initialize the MantaHQ SDK client
// 2. Implement fetchProducts() to get products from your table
// 3. Add category filtering using the 'where' parameter
// 4. Add search functionality using the 'search' parameter
// 5. Add price sorting using 'orderBy' and 'order' parameters
// 6. Implement pagination with 'page' and 'list' parameters
//
// HINTS:
// - Check the SDK docs for fetchAllRecords() syntax
// - The UI is already built - focus only on SDK implementation
// - Look for TODO comments below for specific tasks
// =============================================================================

// TODO: Initialize the MantaHQ SDK client
// Get your API key from the .env file and create a MantaClient instance
const API_KEY = import.meta.env.VITE_MANTAHQ_API_KEY;
const manta = new MantaClient({sdkKey: API_KEY}); // Replace null with: new MantaClient({ sdkKey: API_KEY })



function FetchAllRecords() {
  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      onReset={() => window.location.reload()}
    >
      <Main />
    </ErrorBoundary>
  );
}

function Fallback({ error, resetErrorBoundary }) {
  return (
    <>
      <div
        role="alert"
        className="flex items-center justify-between p-4 bg-red-50 text-red-700"
      >
        <div>
          <p>Something went wrong:</p>
          <pre>{error.message}</pre>
        </div>
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Try again
        </button>
      </div>
      <Navigation query="" setQuery={() => {}} setCurrentPage={() => {}} />
    </>
  );
}

function Main() {
  // State management - already set up for you
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [sortPrice, setSortPrice] = useState("lowest");
  const [query, setQuery] = useState("");

  const itemsPerPage = 6; // Number of products per page (matching the UI requirement)

  // TODO: Implement the fetchProducts function
  async function fetchProducts(retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second delay between retries
    
    setLoading(true);

    try {
      const filterByCategory = category === "all" ? {} : { category };
      const sortOrder = sortPrice === "lowest" ? "asc" : "desc";

      let response;
      try {
        response = await manta.fetchAllRecords({
          table: "products",
          fields: [
            "product_id",
            "name",
            "category",
            "price",
            "stock",
            "description",
            "image_url",
          ],
          where: filterByCategory,
          search: query ? {
            columns: ["name", "description"],
            query: query
          } : undefined,
          orderBy: "price",
          order: sortOrder,
          page: currentPage,
        limit: itemsPerPage, // Changed from 'list' to 'limit'
        });
      } catch (error) {
        // Check if it's a write conflict error and we haven't exceeded max retries
        if (error.statusCode === 500 && 
            error.message.includes("Write conflict") && 
            retryCount < MAX_RETRIES) {
          // Wait for RETRY_DELAY milliseconds
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          // Retry the fetch with incremented retry count
          return fetchProducts(retryCount + 1);
        }
        // If it's not a write conflict or we've exceeded retries, rethrow
        throw error;
      }

      // Parse the response data
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from server');
      }

      let records = [];
      let total = 0;

      // Handle different response formats
      if (Array.isArray(response)) {
        // If response is an array, use it directly
        records = response;
        total = response.length;
      } else if (response.data) {
        // If response has a data property
        records = Array.isArray(response.data) ? response.data : [];
        // Try to get total from various possible properties
        total = response.total || response.count || response.data.length;
      } else {
        // If no recognizable format, throw error
        throw new Error('Unexpected response format from server');
      }

      // Calculate total pages (at least 1 page if we have records)
      const resolvedTotalPages = Math.max(1, Math.ceil(total / itemsPerPage));

      // Update state with the fetched data
      setProducts(records);
      setTotalPages(resolvedTotalPages);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
      setTotalPages(0);
      
      // If it's a write conflict and we haven't exceeded max retries
      if (error.statusCode === 500 && 
          error.message.includes("Write conflict") && 
          retryCount < MAX_RETRIES) {
        console.log(`Retrying... Attempt ${retryCount + 1} of ${MAX_RETRIES}`);
        // Wait for RETRY_DELAY milliseconds
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        // Retry the fetch with incremented retry count
        return fetchProducts(retryCount + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  // Handle category filter change
  function handleSetCategoryFilter(e) {
    setCategory(e.target.value);
    setCurrentPage(1); // Reset to page 1 when filter changes
  }

  // TODO: Set up useEffect to fetch products when dependencies change
  useEffect(() => {
    // Fetch products whenever filters, search, sort, or pagination change
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sortPrice, query, currentPage]);

  return (
    <div>
      <Navigation
        query={query}
        setQuery={setQuery}
        setCurrentPage={setCurrentPage}
      />
      <Header
        category={category}
        onSetCategoryFilter={handleSetCategoryFilter}
        sortPrice={sortPrice}
        setSortPrice={setSortPrice}
      />
      <main className="mx-10 mt-10 flex flex-wrap gap-6">
        <Products products={products} loading={loading} />
      </main>
      <Paging
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />
    </div>
  );
}

// ===============
// UI COMPONENTS
// ===============

function Navigation({ query, setQuery, setCurrentPage }) {
  const [input, setInput] = useState(query || "");
  const [debouncedInput] = useDebounce(input, 700);

  useEffect(() => {
    setQuery(debouncedInput);
    setCurrentPage(1);
  }, [debouncedInput, setQuery, setCurrentPage]);

  return (
    <nav className="flex flex-col space-y-8 items-center justify-between bg-white p-10">
      <h1 className="font-semibold text-5xl tracking-tight">eShopExchange</h1>

      <div className="relative w-full sm:w-[90%] md:w-[70%] lg:w-[50%] xl:w-[40%]">
        <img
          src="search.svg"
          alt="search icon"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
        />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What are you shopping for?"
          className="w-full pl-10 pr-3 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-base md:text-lg"
        />
      </div>
    </nav>
  );
}

function Header({ category, sortPrice, setSortPrice, onSetCategoryFilter }) {
  return (
    <header className="mx-10 my-2 text-base sm:text-base md:text-lg flex justify-between items-center">
      {category === "all" ? (
        "Showing All Products"
      ) : (
        <p>
          Showing products in{" "}
          <span className="text-blue-500 underline">
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </span>
        </p>
      )}
      <div className="flex gap-4">
        <select
          className="rounded-lg px-3 py-2 border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={category}
          onChange={onSetCategoryFilter}
        >
          <option value="all">All products</option>
          <option value="Electronics">Electronics</option>
          <option value="Furniture">Furniture</option>
          <option value="Wearables">Wearables</option>
          <option value="Audio">Audio</option>
          <option value="Accessories">Accessories</option>
        </select>

        <select
          value={sortPrice}
          onChange={(e) => setSortPrice(e.target.value)}
          className="rounded-lg px-3 py-2 border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="lowest">Lowest price</option>
          <option value="highest">Highest price</option>
        </select>
      </div>
    </header>
  );
}

function Products({ products, loading }) {
  return (
    <>
      {loading ? (
        <div className="flex flex-col gap-4 items-center justify-center w-full h-full text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p>Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <p>No products found!</p>
      ) : (
        products.map((product) => (
          <div
            className="flex flex-col cursor-pointer flex-1 min-w-[150px] max-w-[300px] rounded-xl bg-stone-100"
            key={product.product_id}
          >
            <img
              src={product.image_url}
              alt={`product image of a ${product.name}`}
              className="rounded-t-xl max-h-[240px] w-full object-cover"
            />
            <div className="space-y-2 p-6">
              <p className="text-base text-gray-600">
                {product.name} •{" "}
                <span
                  className={`${product.stock <= 10 ? "text-red-500" : ""}`}
                >
                  {product.stock <= 10
                    ? `Only ${product.stock} left`
                    : "In stock"}
                </span>
              </p>
              <h3 className="text-2xl font-semibold text-blue-950">
                ${product.price}
              </h3>
              <p className="text-gray-700 text-lg">
                {product.description.length > 30
                  ? product.description.slice(0, 32) + "..."
                  : product.description}
              </p>
              <span className="text-sm text-blue-500 uppercase tracking-tight font-medium">
                {product.category}
              </span>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function Paging({ currentPage, setCurrentPage, totalPages }) {
  // Don't show pagination if there are no pages
  if (totalPages <= 0) return null;

  return (
    <div className="flex justify-center items-center my-10 space-x-3">
      <button
        disabled={currentPage <= 1}
        onClick={() => setCurrentPage((prevPage) => Math.max(1, prevPage - 1))}
        className="px-4 py-2 cursor-pointer text-base sm:text-xl text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &larr; Previous page
      </button>
      <span className="text-base sm:text-xl">
        Page {currentPage} of {totalPages}
      </span>
      <button
        disabled={currentPage >= totalPages}
        className="px-4 py-2 cursor-pointer text-base sm:text-xl text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() =>
          setCurrentPage((prevPage) => Math.min(totalPages, prevPage + 1))
        }
      >
        Next page &rarr;
      </button>
    </div>
  );
}

export default FetchAllRecords;
