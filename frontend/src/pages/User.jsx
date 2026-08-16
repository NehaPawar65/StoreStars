import { useEffect, useState } from "react";
import api, { errorMessage } from "../api.js";
import { useToast } from "../toast.jsx";

export default function User() {
  const toast = useToast();
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState({ name: "", address: "" });
  const [picked, setPicked] = useState({}); // storeId -> rating chosen
  const [messages, setMessages] = useState({}); // storeId -> message typed

  const load = async () => {
    try {
      const res = await api.get("/stores", { params: search });
      setStores(res.data.data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  useEffect(() => {
    load();
  }, [search.name, search.address]);

  const saveRating = async (store) => {
    const value = Number(picked[store.id] ?? store.my_rating);
    if (!value) return toast.error("Please select a rating from 1 to 5 first");

    // Fall back to the saved message when the user did not touch the box.
    const comment = messages[store.id] ?? store.my_comment ?? "";

    try {
      if (store.my_rating_id) {
        await api.put(`/ratings/${store.my_rating_id}`, { rating: value, comment });
        toast.success(`Your review of ${store.name} was updated`);
      } else {
        await api.post("/ratings", { store_id: store.id, rating: value, comment });
        toast.success(`You rated ${store.name} ${value} out of 5`);
      }
      setPicked({ ...picked, [store.id]: undefined });
      setMessages({ ...messages, [store.id]: undefined });
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <h2>User Dashboard</h2>

      <div className="card">
        <h3>Search Stores</h3>
        <div className="filters">
          <input
            placeholder="Search store name"
            value={search.name}
            onChange={(e) => setSearch({ ...search, name: e.target.value })}
          />
          <input
            placeholder="Search address"
            value={search.address}
            onChange={(e) => setSearch({ ...search, address: e.target.value })}
          />
          <button className="btn small" onClick={() => setSearch({ name: "", address: "" })}>
            Clear
          </button>
        </div>
      </div>

      <div className="card">
        <h3>All Stores ({stores.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Store Name</th>
              <th>Address</th>
              <th>Overall Rating</th>
              <th>My Rating</th>
              <th>Rate / Update</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id}>
                <td>{store.name}</td>
                <td>{store.address}</td>
                <td>
                  {store.total_ratings > 0 ? `${store.overall_rating} (${store.total_ratings})` : "No ratings"}
                </td>
                <td>
                  {store.my_rating ? store.my_rating : "Not Rated"}
                  {store.my_comment && <div className="my-comment">“{store.my_comment}”</div>}
                </td>
                <td>
                  <div className="rate-box">
                    <select
                      value={picked[store.id] ?? store.my_rating ?? ""}
                      onChange={(e) => setPicked({ ...picked, [store.id]: e.target.value })}
                    >
                      <option value="">Select</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <input
                      className="comment-input"
                      maxLength="500"
                      placeholder="Add a message (optional)"
                      value={messages[store.id] ?? store.my_comment ?? ""}
                      onChange={(e) => setMessages({ ...messages, [store.id]: e.target.value })}
                    />
                    <button className="btn small" onClick={() => saveRating(store)}>
                      {store.my_rating_id ? "Update" : "Rate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {stores.length === 0 && (
              <tr>
                <td colSpan="5">No stores found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
