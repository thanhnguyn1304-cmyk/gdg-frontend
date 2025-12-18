import { useState } from 'react';
import { signInWithPopup, type User, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebaseConfig';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Style cơ bản
  const containerStyle = {
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center' as const,
    padding: '50px',
    backgroundColor: '#fff',
    color: '#333',
    minHeight: '100vh'
  };

  const buttonStyle = {
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    backgroundColor: '#4285F4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    margin: '5px'
  };

  // 1. Đăng nhập
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError("Lỗi đăng nhập: " + err.message);
    }
  };

  // 2. Gọi API
  const callBackend = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    setData(null);

    try {
      const token = await user.getIdToken();
      
      // --- CHÚ Ý: ĐỔI LINK RENDER CỦA BẠN VÀO ĐÂY ---
      const API_URL = "https://gdg-python-backend.onrender.com/api/data";
      
      const res = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      });

      if (!res.ok) {
        throw new Error(`Lỗi server: ${res.status}`);
      }

      const result = await res.json();
      setData(result);
      
    } catch (err: any) {
      console.error(err);
      setError("Không gọi được API: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h1>GDG Demo App</h1>
      
      {/* Hiển thị lỗi nếu có */}
      {error && <p style={{color: 'red', fontWeight: 'bold'}}>{error}</p>}

      {!user ? (
        <div>
          <p>Vui lòng đăng nhập để tiếp tục</p>
          <button style={buttonStyle} onClick={handleLogin}>
            Đăng nhập Google
          </button>
        </div>
      ) : (
        <div>
          <h3>Xin chào, {user.displayName}</h3>
          <img 
            src={user.photoURL || ''} 
            alt="User" 
            style={{width: 60, borderRadius: '50%', marginBottom: 20}} 
          />
          <br/>
          
          <button style={buttonStyle} onClick={callBackend} disabled={loading}>
            {loading ? "Đang tải..." : "Gọi Backend Python"}
          </button>

          <button 
            style={{...buttonStyle, backgroundColor: '#dc3545'}} 
            onClick={() => { signOut(auth); setUser(null); setData(null); }}
          >
            Đăng xuất
          </button>

          {/* Kết quả trả về */}
          {data && (
            <div style={{marginTop: 30, padding: 20, border: '1px solid #ccc', borderRadius: 8, backgroundColor: '#f9f9f9'}}>
              <h3 style={{color: 'green'}}>Thành công!</h3>
              <p><b>Message:</b> {data.message}</p>
              <p><b>Email:</b> {data.email}</p>
              <p><b>UID:</b> {data.user_uid}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;