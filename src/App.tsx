import { useState, useEffect } from 'react';
import { signInWithPopup, type User, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebaseConfig';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, Zap, List, User as UserIcon, LogOut, Trash2, CheckCircle2 } from 'lucide-react';

// --- CẤU HÌNH ---
const API_URL = "https://gdg-python-backend.onrender.com";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<any[]>([]); // Danh sách thẻ bài để quẹt
  const [myList, setMyList] = useState<any[]>([]); // Danh sách đã lưu
  const [activeTab, setActiveTab] = useState<'SWIPE' | 'LIST' | 'PROFILE'>('SWIPE');
  const [notification, setNotification] = useState<string | null>(null);

  // 1. Khởi tạo
  useEffect(() => {
    // Gọi API lấy gợi ý ngẫu nhiên ngay khi mở app
    fetchSuggestions();

    // Lắng nghe trạng thái đăng nhập
    const unsubscribe = auth.onAuthStateChanged(u => {
      setUser(u);
      if (u) fetchMyList(u); // Nếu đã đăng nhập thì lấy danh sách đã lưu
    });
    return () => unsubscribe();
  }, []);

  // --- API FUNCTIONS ---

  // Hàm lấy gợi ý ngẫu nhiên từ Backend
  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/suggestions`);
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (error) {
      console.error("Lỗi lấy gợi ý:", error);
    }
  };

  // Hàm lấy danh sách đã lưu của User
  const fetchMyList = async (currentUser: User) => {
    const token = await currentUser.getIdToken();
    const res = await fetch(`${API_URL}/api/activities`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setMyList(await res.json());
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2000);
  };

  // Xử lý Quẹt Phải (Lưu)
  const handleSwipeRight = async (card: any) => {
    setCards(prev => prev.filter(c => c.id !== card.id));
    showToast(`Đã lưu: ${card.title}`);
    
    // Optimistic Update
    const newItem = { ...card, created_at: new Date().toISOString() };
    setMyList(prev => [newItem, ...prev]);

    if (user) {
      const token = await user.getIdToken();
      await fetch(`${API_URL}/api/activities`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title: card.title, description: card.desc, priority: "High" })
      });
    }
  };

  // Xử lý Xóa
  const handleDelete = async (id: number) => {
    if (!confirm("Xóa hoạt động này?")) return;
    setMyList(prev => prev.filter(item => item.id !== id)); // Update UI ngay
    
    if (user) {
      const token = await user.getIdToken();
      await fetch(`${API_URL}/api/activities/${id}`, {
         method: "DELETE",
         headers: { Authorization: `Bearer ${token}` }
      });
    }
  };

  // --- SUB COMPONENTS ---

  const Card = ({ data, onSwipe }: { data: any, onSwipe: (dir: 'left' | 'right') => void }) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
    const bg = useTransform(x, [-150, 0, 150], ["#fee2e2", "#ffffff", "#dcfce7"]);

    return (
      <motion.div
        style={{ x, rotate, opacity, backgroundColor: bg }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(e, info) => {
          if (info.offset.x > 100) onSwipe('right');
          else if (info.offset.x < -100) onSwipe('left');
        }}
        className="absolute top-0 w-full h-full rounded-3xl shadow-xl cursor-grab active:cursor-grabbing flex flex-col overflow-hidden bg-white border border-gray-100 touch-none"
      >
        {/* Header màu sắc và ICON */}
        <div className={`h-2/5 w-full bg-gradient-to-br ${data.color} flex items-center justify-center`}>
          {/* ĐÃ SỬA: Hiển thị icon từ dữ liệu (ví dụ: 🔥) */}
          <span className="text-7xl drop-shadow-md filter">{data.icon}</span>
        </div>
        <div className="flex-1 p-6 flex flex-col justify-center text-center bg-white">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{data.title}</h2>
          <p className="text-gray-500 text-lg leading-relaxed">{data.desc}</p>
        </div>
        {/* Overlay Text khi kéo */}
        <motion.div style={{ opacity: useTransform(x, [50, 150], [0, 1]) }} className="absolute top-8 left-8 border-4 border-green-500 text-green-500 font-bold text-2xl px-4 py-2 rounded transform -rotate-12">LIKE</motion.div>
        <motion.div style={{ opacity: useTransform(x, [-150, -50], [1, 0]) }} className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-bold text-2xl px-4 py-2 rounded transform rotate-12">NOPE</motion.div>
      </motion.div>
    );
  };

  // --- MAIN UI ---

  // 1. Màn hình Login
  if (!user) return (
    <div className="h-screen w-full bg-gray-900 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      
      <div className="z-10 text-center">
        <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-pink-500 to-orange-400 rounded-3xl mb-8 shadow-2xl flex items-center justify-center text-4xl transform rotate-3">🔥</div>
        <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight">Activity <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-400">Match</span></h1>
        <p className="text-gray-400 mb-10 text-lg max-w-xs mx-auto">Đừng để cuối tuần nhàm chán. Quẹt để tìm niềm vui mới!</p>
        
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-white text-gray-900 px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg">
          <img src="https://www.google.com/favicon.ico" className="w-6 h-6" />
          Tiếp tục với Google
        </button>
      </div>
    </div>
  );

  // 2. Màn hình chính (App Layout)
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-200 font-sans">
      {/* Mobile Container */}
      <div className="w-full max-w-md h-[100dvh] bg-gray-50 flex flex-col relative shadow-2xl overflow-hidden md:h-[850px] md:rounded-[40px] md:border-[8px] md:border-gray-900">
        
        {/* Header */}
        <header className="px-6 py-4 bg-white flex justify-between items-center z-10 sticky top-0">
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-orange-500">
            {activeTab === 'SWIPE' ? 'Khám phá' : activeTab === 'LIST' ? 'Danh sách' : 'Hồ sơ'}
          </h1>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 p-[2px]">
            <img src={user.photoURL || ''} className="w-full h-full rounded-full border-2 border-white" />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 relative overflow-hidden">
          
          {/* TAB 1: SWIPE */}
          {activeTab === 'SWIPE' && (
            <div className="h-full w-full flex flex-col items-center justify-center p-4">
              <div className="relative w-full max-w-xs aspect-[3/4]">
                <AnimatePresence>
                  {cards.length > 0 ? (
                    cards.map((card, index) => {
                      if (index < cards.length - 2) return null;
                      return (
                         <Card key={card.id} data={card} onSwipe={(dir) => dir === 'right' ? handleSwipeRight(card) : setCards(p => p.filter(c => c.id !== card.id))} />
                      )
                    })
                  ) : (
                     <div className="text-center">
                        <div className="text-6xl mb-4 animate-bounce">🎉</div>
                        <h3 className="text-xl font-bold text-gray-800">Hết kèo rồi!</h3>
                        <p className="text-gray-500 mb-6">Bấm nút dưới để lấy danh sách mới.</p>
                        {/* Nút này gọi lại API để lấy danh sách ngẫu nhiên mới */}
                        <button onClick={fetchSuggestions} className="px-6 py-2 bg-white border border-gray-300 rounded-full font-bold text-sm shadow-sm hover:bg-gray-50">Làm lại từ đầu</button>
                     </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* TAB 2: LIST */}
          {activeTab === 'LIST' && (
            <div className="h-full overflow-y-auto p-4 space-y-3 pb-24">
              {myList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                   <List size={48} className="mb-4 opacity-20" />
                   <p>Chưa có hoạt động nào.</p>
                </div>
              ) : (
                myList.map((item, idx) => (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 group">
                    {/* Hiển thị icon tương ứng (hoặc icon mặc định nếu không tìm thấy) */}
                    <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-2xl">
                      {item.icon || '✨'} 
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{item.title}</h3>
                      <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                    {/* Delete Button */}
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PROFILE */}
          {activeTab === 'PROFILE' && (
            <div className="h-full flex flex-col items-center p-8 bg-gray-50">
               <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-pink-500 to-orange-400 mb-4">
                  <img src={user.photoURL || ''} className="w-full h-full rounded-full border-4 border-white object-cover" />
               </div>
               <h2 className="text-2xl font-bold text-gray-800">{user.displayName}</h2>
               <p className="text-gray-500 mb-8">{user.email}</p>

               <div className="w-full bg-white rounded-2xl p-4 shadow-sm mb-6">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                     <span className="text-gray-600">Đã lưu</span>
                     <span className="font-bold text-pink-500">{myList.length} Hoạt động</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                     <span className="text-gray-600">Trạng thái</span>
                     <span className="flex items-center text-green-500 font-bold gap-1"><CheckCircle2 size={16}/> Online</span>
                  </div>
               </div>

               <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-100 transition-colors w-full justify-center">
                  <LogOut size={20} /> Đăng xuất
               </button>
            </div>
          )}

          {/* Toast Notification */}
          <AnimatePresence>
            {notification && (
              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="absolute bottom-6 left-0 right-0 mx-auto w-max bg-gray-900 text-white px-6 py-2 rounded-full shadow-lg z-50 text-sm font-bold flex items-center gap-2">
                <Heart size={16} className="text-pink-500 fill-current" /> {notification}
              </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* Bottom Navigation Bar */}
        <nav className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20 pb-safe">
          <button onClick={() => setActiveTab('SWIPE')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'SWIPE' ? 'text-pink-500' : 'text-gray-300'}`}>
            <Zap size={24} fill={activeTab === 'SWIPE' ? "currentColor" : "none"} />
            <span className="text-[10px] font-bold">Khám phá</span>
          </button>
          <button onClick={() => setActiveTab('LIST')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'LIST' ? 'text-pink-500' : 'text-gray-300'}`}>
            <List size={24} strokeWidth={activeTab === 'LIST' ? 3 : 2} />
            <span className="text-[10px] font-bold">Đã lưu</span>
          </button>
          <button onClick={() => setActiveTab('PROFILE')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'PROFILE' ? 'text-pink-500' : 'text-gray-300'}`}>
            <UserIcon size={24} fill={activeTab === 'PROFILE' ? "currentColor" : "none"} />
            <span className="text-[10px] font-bold">Hồ sơ</span>
          </button>
        </nav>

      </div>
    </div>
  );
}

export default App;