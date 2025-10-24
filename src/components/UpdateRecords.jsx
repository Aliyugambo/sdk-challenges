import { MantaClient } from "mantahq-sdk";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { ErrorBoundary } from "react-error-boundary";
import AddProductForm from "./AddProductForm";
import EditProductForm from "./EditProductForm";

// TODO: Features implemented with fetchAllRecords:
// ✅ Set up the SDK
// ✅ Fetch products from data source on MantaHQ
// ✅ Display in Products component
// ✅ Add category filter
// ✅ Add price sorting
// ✅ Add pagination
// ✅ Add search functionality

// TODO: Features implemented with createRecords:
// ✅ Create an "Add Product" button in the Navigation component
// ✅ Add state for modal visibility (isOpen)
// ✅ Create AddProductForm component with form fields (name, category, price, stock, description, image_url)
// ✅ Implement createProduct function using manta.createRecords()
// ✅ Add form validation (name: minLength 3, price: > 0, stock: >= 0)
// ✅ Generate unique product_id using timestamp
// ✅ Use upsert option to handle potential conflicts
// ✅ Handle errors and show user-friendly messages
// ✅ Close modal on successful submission
// ✅ Refetch products list after creating new product
// ✅ Add loading state while creating product
// ✅ Test with duplicate product_ids to verify upsert behavior

// TODO: Features to add with updateRecords method:
// - Add "Edit" button on each product card
// - Add state for edit modal visibility (isEditOpen)
// - Add state to track which product is being edited (selectedProduct)
// - Create EditProductForm component with pre-filled form fields
// - Implement updateProduct function using manta.updateRecords()
// - CRITICAL: Always include where clause to target specific product
// - Add validation using validationRule (singular, not plural!)
// - Update only the fields that changed
// - Handle errors with user-friendly messages
// - Close modal on successful update
// - Refetch products list after updating
// - Add loading state while updating
// - BONUS: Implement bulk price update by category
// - BONUS: Add discount system using updateRecords
// - BONUS: Implement stock adjustment feature
// - BONUS: Add dryRun preview before bulk updates
// - BONUS: Mark low stock items automatically

const API_KEY = import.meta.env.VITE_MANTAHQ_API_KEY;
const manta = new MantaClient({
  sdkKey: API_KEY,
});

function UpdateRecords() {
  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      onReset={() => window.location.reload()}>
      <Main />
    </ErrorBoundary>
  );
}

function Fallback({ error, resetErrorBoundary }) {
  return (
    <>
      <div
        role="alert"
        className="flex items-center justify-between p-4 bg-red-50 text-red-700">
        <div>
          <p>Something went wrong:</p>
          <pre>{error.message}</pre>
        </div>
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-500 text-white px-4 py-2 rounded">
          Try again
        </button>
      </div>
      <Navigation query="" setQuery={() => {}} setCurrentPage={() => {}} />
    </>
  );
}

function Main() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [sortPrice, setSortPrice] = useState("lowest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");

  // Create product modal
  const [isOpen, setIsOpen] = useState(false);

  // States for edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filterByCategory = category === "all" ? {} : { category: category };
  const sortOrder = sortPrice === "lowest" ? "asc" : "desc";

  const itemsPerPage = 4;

  async function fetchProducts() {
    try {
      const products = await manta.fetchAllRecords({
        table: "products2",
        where: filterByCategory,
        fields: [
          "product_id",
          "name",
          "category",
          "price",
          "stock",
          "description",
          "image_url",
        ],
        search: {
          columns: ["name", "description", "category"],
          query: query,
        },
        orderBy: "price",
        order: sortOrder,
        page: currentPage,
        list: itemsPerPage,
      });

      if (!products.status) throw new Error("Failed to fetch products");

      setProducts(products.data);
      setTotalPages(products.meta.totalPages);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createProducts(formData) {
    try {
      const response = await manta.createRecords({
        table: "products2",
        data: [
          {
            name: formData.name,
            category: formData.category,
            product_id: `P${Date.now()}`,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            description: formData.description || "",
            image_url: formData.image_url || "https://via.placeholder.com/300",
          },
        ],
        options: {
          upsert: true,
          conflictKeys: ["product_id"],
        },
      });

      console.log(response);

      if (!response.status) {
        throw new Error("Failed to create product");
      }

      await fetchProducts();
      alert("Product added successfully!");
    } catch (error) {
      console.error(error);
      alert("Error adding product: " + error.message);
      throw error;
    }
  }

  // TODO: Implement updateProduct function
  async function updateProduct(productId, formData) {
    // Local validation before making the API call
    if (!formData.name || formData.name.length < 3) {
      throw new Error("Product name must be at least 3 characters long");
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      throw new Error("Price must be greater than 0");
    }
    if (formData.stock === undefined || parseInt(formData.stock) < 0) {
      throw new Error("Stock must be 0 or greater");
    }

    try {
      setLoading(true);

      // Format the data for update
      const updateData = {
        name: formData.name.trim(),
        category: formData.category,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        description: formData.description?.trim() || "",
        image_url: formData.image_url?.trim() || "https://via.placeholder.com/300"
      };

      const response = await manta.updateRecords({
        table: "products2",
        data: updateData,
        where: { product_id: productId }, // CRITICAL: target specific product
        options: {
          validationRule: { // Note: singular, not plural!
            name: { minLength: 3 },
            price: { min: 0 },
            stock: { min: 0 }
          }
        }
      });

      if (!response.status) {
        throw new Error(response.message || "Failed to update product");
      }

      // Success! Close modal and refresh products
      setIsEditOpen(false);
      setSelectedProduct(null);
      await fetchProducts(); // Refresh the product list
      
      // Show success message
      alert("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      const errorMessage = error.message || "Failed to update product. Please try again.";
      alert(errorMessage); // Show user-friendly error message
    } finally {
      setLoading(false);
    }
  }

  // Handle opening edit modal
  function handleEditProduct(product) {
    setSelectedProduct(product);
    setIsEditOpen(true);
  }

  function handleSetCategoryFilter(e) {
    setCategory(e.target.value);
    setCurrentPage(1);
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, [category, sortPrice, currentPage, itemsPerPage, query]);

  return (
    <div className="">
      <Navigation
        query={query}
        setQuery={setQuery}
        setCurrentPage={setCurrentPage}
        onOpenForm={() => setIsOpen(true)}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
      <Header
        category={category}
        onSetCategoryFilter={handleSetCategoryFilter}
        sortPrice={sortPrice}
        setSortPrice={setSortPrice}
      />
      <main className="mx-10 mt-10 flex flex-wrap gap-6">
        <Products
          products={products}
          loading={loading}
          // Passing handleEditProduct as prop
          onEdit={handleEditProduct}
        />
      </main>
      <Paging
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />

      <AddProductForm
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        onSubmit={createProducts}
      />

      {/* Add Edit Product Modal */}
      {selectedProduct && (
        <EditProductForm
          isOpen={isEditOpen}
          setIsOpen={setIsEditOpen}
          product={selectedProduct}
          onSubmit={(formData) =>
            updateProduct(selectedProduct.product_id, formData)
          }
        />
      )}
    </div>
  );
}

function Navigation({ query, setQuery, setCurrentPage, onOpenForm }) {
  const [input, setInput] = useState(query || "");
  const [debouncedInput] = useDebounce(input, 700);

  useEffect(() => {
    setQuery(debouncedInput);
    setCurrentPage(1);
  }, [debouncedInput, setQuery, setCurrentPage]);

  return (
    <nav className="flex flex-col space-y-8 items-center justify-between bg-white p-10">
      <h1 className="font-semibold text-5xl tracking-tight">eShopExchange</h1>
      <button
        className="font-medium text-[14px] bg-amber-400 px-10 py-4 rounded-md cursor-pointer hover:bg-amber-400/80 transition"
        onClick={onOpenForm}>
        List an item
      </button>

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
        <p className="">
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
          onChange={onSetCategoryFilter}>
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
          className="rounded-lg px-3 py-2 border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="lowest">Lowest price</option>
          <option value="highest">Highest price</option>
        </select>
      </div>
    </header>
  );
}

function Products({ products, loading, onEdit }) {
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
            key={product.product_id}>
            <img
              src={product.image_url}
              alt={`product image of a ${product.name}`}
              className="rounded-t-xl max-h-[240px] w-full object-cover"
            />
            <div className="space-y-2 p-6">
              <p className="text-base text-gray-600">
                {product.name} •{" "}
                <span
                  className={`${product.stock <= 10 ? "text-red-500" : ""}`}>
                  {product.stock <= 10
                    ? `Only ${product.stock} left`
                    : "In stock"}
                </span>
              </p>
              <h3 className="text-2xl font-semibold text-blue-950">
                ${product.price}
              </h3>
              <p className="text-gray-700 text-lg">
                {product.description?.length > 30
                  ? product.description.slice(0, 32) + "..."
                  : product.description || "No description"}
              </p>
              <span className="text-sm text-blue-500 uppercase tracking-tight font-medium">
                {product.category}
              </span>

              {/* Edit button */}
              <button
                onClick={() => onEdit(product)}
                className="w-full mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition">
                Edit Product
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function Paging({ currentPage, setCurrentPage, totalPages }) {
  return (
    <div className="flex justify-center items-center my-10 space-x-3">
      <button
        disabled={currentPage === 1}
        onClick={() => setCurrentPage((prevPage) => Math.max(1, prevPage - 1))}
        className="px-4 py-2 cursor-pointer text-base sm:text-xl text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
        &larr; Previous page
      </button>
      <span className="text-base sm:text-xl">
        Page {currentPage} of {totalPages === 0 ? "-" : totalPages}
      </span>
      <button
        disabled={currentPage === totalPages || totalPages === 0}
        className="px-4 py-2 cursor-pointer text-base sm:text-xl text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() =>
          setCurrentPage((prevPage) => Math.min(totalPages, prevPage + 1))
        }>
        Next page &rarr;
      </button>
    </div>
  );
}

export default UpdateRecords;
