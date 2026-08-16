import { useEffect, useState } from "react";
import api, { errorMessage } from "../api.js";
import { useToast } from "../toast.jsx";

export default function Owner() {
  const toast = useToast();
  const [stores, setStores] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get("/owner/dashboard")
      .then((res) => setStores(res.data.data))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoaded(true));
  }, [toast]);

  return (
    <div>
      <h2>Store Owner Dashboard</h2>

      {loaded && stores.length === 0 && (
        <div className="card">
          <p>No store has been assigned to your account yet. Please contact the administrator.</p>
        </div>
      )}

      {stores.map((store) => (
        <div className="card" key={store.id}>
          <h3>My Store: {store.name}</h3>
          <p className="muted">
            {store.email} &middot; {store.address}
          </p>

          <div className="stats">
            <div className="stat">
              <span className="stat-value">{store.total_ratings > 0 ? store.average_rating : "0"}</span>
              <span>Average Rating</span>
            </div>
            <div className="stat">
              <span className="stat-value">{store.total_ratings}</span>
              <span>Total Ratings</span>
            </div>
          </div>

          <h4>Users who rated this store</h4>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Rating</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {store.raters.map((rater) => (
                <tr key={rater.email}>
                  <td>{rater.name}</td>
                  <td>{rater.email}</td>
                  <td>{rater.rating}</td>
                  <td>{rater.comment ? rater.comment : <span className="muted">No message</span>}</td>
                </tr>
              ))}
              {store.raters.length === 0 && (
                <tr>
                  <td colSpan="4">Nobody has rated this store yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
