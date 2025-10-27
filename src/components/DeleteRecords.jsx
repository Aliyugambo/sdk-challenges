import { MantaClient } from "mantahq-sdk";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { ErrorBoundary } from "react-error-boundary";
import AddProductForm from "./AddProductForm";
import EditProductForm from "./EditProductForm";
import DeleteConfirmModal from "./DeleteConfirmModal";

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
// ✅ Create AddProductForm component with form fields
// ✅ Implement createProduct function using manta.createRecords()
// ✅ Add form validation (name: minLength 3, price: > 0, stock: >= 0)
// ✅ Generate unique product_id using timestamp
// ✅ Use upsert option to handle potential conflicts
// ✅ Handle errors and show user-friendly messages
// ✅ Close modal on successful submission
// ✅ Refetch products list after creating new product
// ✅ Add loading state while creating product

// TODO: Features implemented with updateRecords:
// ✅ Add "Edit" button on each product card
// ✅ Add state for edit modal visibility (isEditOpen)
// ✅ Add state to track which product is being edited (selectedProduct)
// ✅ Create EditProductForm component with pre-filled form fields
// ✅ Implement updateProduct function using manta.updateRecords()
// ✅ Always include where clause to target specific product
// ✅ Add validation using validationRule (singular!)
// ✅ Handle errors with user-friendly messages
// ✅ Close modal on successful update
// ✅ Refetch products list after updating
// ✅ Add loading state while updating

// TODO: Features to add with deleteRecords method:
// - Add delete icon (trash) on upper right of each product card
// - Add state for delete confirmation modal (isDeleteOpen)
// - Add state to track which product is being deleted (productToDelete)
// - Create DeleteConfirmModal component with warning message
// - Implement deleteProduct function using manta.deleteRecords()
// - CRITICAL: Always include where clause to delete specific product
// - Show product name in confirmation message
// - Handle errors with user-friendly messages
// - Close modal after successful deletion
// - Refetch products list after deleting
// - Add loading state while deleting
// - Prevent accidental deletion with confirmation step
// - BONUS: Add "undo" feature (soft delete)
// - BONUS: Implement bulk delete by category
// - BONUS: Add archive instead of delete option
// - BONUS: Show deleted count in success message

const API_KEY = import.meta.env.VITE_MANTAHQ_API_KEY;
const manta = new MantaClient({
  sdkKey: API_KEY,
});

function DeleteRecords() {
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

  // Edit product modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // States for delete confirmation
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

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

  async function updateProduct(productId, formData) {
    try {
      const response = await manta.updateRecords({
        table: "products2",
        data: {
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          description: formData.description,
          image_url: formData.image_url,
        },
        where: { product_id: productId },
        options: {
          validationRule: {
            name: { required: true, minLength: 3 },
            price: { required: true, greaterThan: 0 },
            stock: { required: true, greaterOrEqual: 0 },
          },
        },
      });

      if (!response.status) {
        throw new Error("Error updating product!");
      }

      await fetchProducts();
      alert(`Successfully updated product: ${formData.name}`);
    } catch (error) {
      console.error(error);
      alert("Error updating product: " + error.message);
    }
  }

  // Implement deleteProduct function with safe deletion practices
  async function deleteProduct(productId) {
    try {
      // Get product details before deletion for the success message
      const productToDelete = products.find(p => p.product_id === productId);
      if (!productToDelete) {
        throw new Error('Product not found');
      }

      // Call manta.deleteRecords with where clause to target specific product
      const response = await manta.deleteRecords({
        table: "products2",
        where: { product_id: productId }
      });

      // Check response status
      if (!response.status) {
        throw new Error('Failed to delete product');
      }

      // Refresh products list after successful deletion
      await fetchProducts();

      // Show success alert with product name
      alert(`Successfully deleted product: ${productToDelete.name}`);
    } catch (error) {
      console.error(error);
      // Show user-friendly error message
      alert('Error deleting product: ' + (error.message || 'Unknown error occurred'));
    }
  }

  function handleEditProduct(product) {
    setSelectedProduct(product);
    setIsEditOpen(true);
  }

  // Handle opening delete confirmation
  function handleDeleteProduct(product) {
    setProductToDelete(product);
    setIsDeleteOpen(true);
  }

  // Handle confirming deletion
  function handleConfirmDelete() {
    if (productToDelete) {
      deleteProduct(productToDelete.product_id);
      setIsDeleteOpen(false);
      setProductToDelete(null);
    }
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
          onEdit={handleEditProduct}
          // Passing handleDeleteProduct
          onDelete={handleDeleteProduct}
        />
      </main>
      <Paging
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />

      {/* Add Product Modal */}
      <AddProductForm
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        onSubmit={createProducts}
      />

      {/* Edit Product Modal */}
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

      {/*  Delete Confirmation Modal */}
      {productToDelete && (
        <DeleteConfirmModal
          isOpen={isDeleteOpen}
          setIsOpen={setIsDeleteOpen}
          product={productToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setIsDeleteOpen(false);
            setProductToDelete(null);
          }}
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

function Products({ products, loading, onEdit, onDelete }) {
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
            className="relative flex flex-col cursor-pointer flex-1 min-w-[150px] max-w-[300px] rounded-xl bg-stone-100"
            key={product.product_id}>
            {/* Delete Icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(product);
              }}
              className="absolute top-2 right-4 p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition z-10"
              aria-label="Delete product">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6">
                <path
                  fillRule="evenodd"
                  d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

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

              <button
                onClick={() => onEdit(product)}
                className="w-full cursor-pointer mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition">
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

export default DeleteRecords;
