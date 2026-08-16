import { useEffect, useState } from "react";
import api, { errorMessage } from "../api.js";
import { validateForm } from "../auth.jsx";
import { useToast } from "../toast.jsx";

function SortHeader({ label, field, sort, setSort }) {
  const active = sort.by === field;
  const toggle = () => setSort({ by: field, order: active && sort.order === "asc" ? "desc" : "asc" });
  return (
    <th className="sortable" onClick={toggle}>
      {label} {active ? (sort.order === "asc" ? "↑" : "↓") : ""}
    </th>
  );
}

const emptyUser = { name: "", email: "", password: "", address: "", role: "USER" };
const emptyStore = { name: "", email: "", address: "", owner_id: "" };

export default function Admin() {
  const toast = useToast();
  const [stats, setStats] = useState({ users: 0, stores: 0, ratings: 0 });

  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState({ name: "", email: "", address: "", role: "" });
  const [userSort, setUserSort] = useState({ by: "name", order: "asc" });

  const [stores, setStores] = useState([]);
  const [storeFilter, setStoreFilter] = useState({ name: "", email: "", address: "" });
  const [storeSort, setStoreSort] = useState({ by: "name", order: "asc" });

  const [owners, setOwners] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [userForm, setUserForm] = useState(emptyUser);
  const [storeForm, setStoreForm] = useState(emptyStore);
  const [detail, setDetail] = useState(null);

  /* ---------------- loading data ---------------- */

  const loadStats = () =>
    api
      .get("/admin/stats")
      .then((res) => setStats(res.data.data))
      .catch((err) => toast.error(errorMessage(err)));

  const loadOwners = () =>
    api
      .get("/admin/users", { params: { role: "OWNER" } })
      .then((res) => setOwners(res.data.data))
      .catch((err) => toast.error(errorMessage(err)));

  const loadUsers = () =>
    api
      .get("/admin/users", { params: { ...userFilter, sort: userSort.by, order: userSort.order } })
      .then((res) => setUsers(res.data.data))
      .catch((err) => toast.error(errorMessage(err)));

  const loadStores = () =>
    api
      .get("/admin/stores", { params: { ...storeFilter, sort: storeSort.by, order: storeSort.order } })
      .then((res) => setStores(res.data.data))
      .catch((err) => toast.error(errorMessage(err)));

  useEffect(() => {
    loadStats();
    loadOwners();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [userFilter.name, userFilter.email, userFilter.address, userFilter.role, userSort.by, userSort.order]);

  useEffect(() => {
    loadStores();
  }, [storeFilter.name, storeFilter.email, storeFilter.address, storeSort.by, storeSort.order]);

  /* ---------------- create user / store ---------------- */

  const addUser = async (e) => {
    e.preventDefault();

    const problem = validateForm({
      name: userForm.name,
      email: userForm.email,
      address: userForm.address,
      password: userForm.password,
    });
    if (problem) return toast.error(problem);

    try {
      await api.post("/admin/users", userForm);
      toast.success(`${userForm.role} account created`);
      setUserForm(emptyUser);
      setShowUserForm(false);
      loadUsers();
      loadOwners();
      loadStats();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const addStore = async (e) => {
    e.preventDefault();

    const problem = validateForm({ name: storeForm.name, email: storeForm.email, address: storeForm.address });
    if (problem) return toast.error(problem);
    if (!storeForm.owner_id) return toast.error("Please choose a store owner");

    try {
      await api.post("/admin/stores", { ...storeForm, owner_id: Number(storeForm.owner_id) });
      toast.success(`Store "${storeForm.name}" created`);
      setStoreForm(emptyStore);
      setShowStoreForm(false);
      loadStores();
      loadStats();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const viewUser = async (id) => {
    try {
      const res = await api.get(`/admin/users/${id}`);
      setDetail(res.data.data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  /* ---------------- render ---------------- */

  return (
    <div>
      <h2>Admin Dashboard</h2>

      <div className="stats">
        <div className="stat">
          <span className="stat-value">{stats.users}</span>
          <span>Total Users</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.stores}</span>
          <span>Total Stores</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.ratings}</span>
          <span>Total Ratings</span>
        </div>
      </div>

      <div className="row-buttons">
        <button className="btn" onClick={() => setShowUserForm(!showUserForm)}>
          {showUserForm ? "Close" : "Add User"}
        </button>
        <button className="btn" onClick={() => setShowStoreForm(!showStoreForm)}>
          {showStoreForm ? "Close" : "Add Store"}
        </button>
      </div>

      {showUserForm && (
        <div className="card">
          <h3>Add New User</h3>
          <form onSubmit={addUser}>
            <label>Name</label>
            <input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />

            <label>Email</label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              required
            />

            <label>Password</label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              required
            />

            <label>Address</label>
            <textarea
              rows="2"
              value={userForm.address}
              onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
              required
            />

            <label>Role</label>
            <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="OWNER">OWNER</option>
            </select>

            <button className="btn" type="submit">
              Create User
            </button>
          </form>
        </div>
      )}

      {showStoreForm && (
        <div className="card">
          <h3>Add New Store</h3>
          <form onSubmit={addStore}>
            <label>Store Name</label>
            <input
              value={storeForm.name}
              onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
              required
            />

            <label>Email</label>
            <input
              type="email"
              value={storeForm.email}
              onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
              required
            />

            <label>Address</label>
            <textarea
              rows="2"
              value={storeForm.address}
              onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
              required
            />

            <label>Store Owner</label>
            <select
              value={storeForm.owner_id}
              onChange={(e) => setStoreForm({ ...storeForm, owner_id: e.target.value })}
              required
            >
              <option value="">-- Select an owner --</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name} ({owner.email})
                </option>
              ))}
            </select>
            {owners.length === 0 && <p className="muted">Create a user with role OWNER first.</p>}

            <button className="btn" type="submit">
              Create Store
            </button>
          </form>
        </div>
      )}

      {/* ---------------- users ---------------- */}
      <div className="card">
        <h3>Users ({users.length})</h3>
        <div className="filters">
          <input
            placeholder="Search name"
            value={userFilter.name}
            onChange={(e) => setUserFilter({ ...userFilter, name: e.target.value })}
          />
          <input
            placeholder="Search email"
            value={userFilter.email}
            onChange={(e) => setUserFilter({ ...userFilter, email: e.target.value })}
          />
          <input
            placeholder="Search address"
            value={userFilter.address}
            onChange={(e) => setUserFilter({ ...userFilter, address: e.target.value })}
          />
          <select value={userFilter.role} onChange={(e) => setUserFilter({ ...userFilter, role: e.target.value })}>
            <option value="">All roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
            <option value="OWNER">OWNER</option>
          </select>
          <button className="btn small" onClick={() => setUserFilter({ name: "", email: "", address: "", role: "" })}>
            Clear
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <SortHeader label="Name" field="name" sort={userSort} setSort={setUserSort} />
              <SortHeader label="Email" field="email" sort={userSort} setSort={setUserSort} />
              <SortHeader label="Address" field="address" sort={userSort} setSort={setUserSort} />
              <SortHeader label="Role" field="role" sort={userSort} setSort={setUserSort} />
              <SortHeader label="Rating" field="rating" sort={userSort} setSort={setUserSort} />
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.address}</td>
                <td>{user.role}</td>
                <td>{user.role === "OWNER" ? (user.rating ?? "No ratings") : "-"}</td>
                <td>
                  <button className="btn small" onClick={() => viewUser(user.id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="6">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- stores ---------------- */}
      <div className="card">
        <h3>Stores ({stores.length})</h3>
        <div className="filters">
          <input
            placeholder="Search name"
            value={storeFilter.name}
            onChange={(e) => setStoreFilter({ ...storeFilter, name: e.target.value })}
          />
          <input
            placeholder="Search email"
            value={storeFilter.email}
            onChange={(e) => setStoreFilter({ ...storeFilter, email: e.target.value })}
          />
          <input
            placeholder="Search address"
            value={storeFilter.address}
            onChange={(e) => setStoreFilter({ ...storeFilter, address: e.target.value })}
          />
          <button className="btn small" onClick={() => setStoreFilter({ name: "", email: "", address: "" })}>
            Clear
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <SortHeader label="Name" field="name" sort={storeSort} setSort={setStoreSort} />
              <SortHeader label="Email" field="email" sort={storeSort} setSort={setStoreSort} />
              <SortHeader label="Address" field="address" sort={storeSort} setSort={setStoreSort} />
              <SortHeader label="Owner" field="owner_name" sort={storeSort} setSort={setStoreSort} />
              <SortHeader label="Rating" field="rating" sort={storeSort} setSort={setStoreSort} />
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id}>
                <td>{store.name}</td>
                <td>{store.email}</td>
                <td>{store.address}</td>
                <td>{store.owner_name || "-"}</td>
                <td>{store.total_ratings > 0 ? `${store.rating} (${store.total_ratings})` : "No ratings"}</td>
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

      {/* ---------------- user details ---------------- */}
      {detail && (
        <div className="modal-back" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>User Details</h3>
            <p>
              <b>Name:</b> {detail.name}
            </p>
            <p>
              <b>Email:</b> {detail.email}
            </p>
            <p>
              <b>Address:</b> {detail.address}
            </p>
            <p>
              <b>Role:</b> {detail.role}
            </p>

            {detail.role === "OWNER" && (
              <>
                <h4>Stores</h4>
                {detail.stores.length === 0 && <p className="muted">No store assigned yet.</p>}
                {detail.stores.map((store) => (
                  <p key={store.id}>
                    <b>{store.name}</b> — Average Rating:{" "}
                    {store.total_ratings > 0 ? `${store.rating} (${store.total_ratings} ratings)` : "No ratings"}
                  </p>
                ))}
              </>
            )}

            <button className="btn" onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
