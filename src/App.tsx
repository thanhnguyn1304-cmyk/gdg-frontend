import { useState, useEffect } from 'react';
import { signInWithPopup, type User, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebaseConfig';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Zap, List, User as UserIcon, CheckCircle2, Trophy, Loader2, X } from 'lucide-react';

const API_URL = "https://gdg-python-backend.onrender.com";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [myList, setMyList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'SWIPE' | 'LIST' | 'PROFILE'>('SWIPE');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => {
      setUser(u);
      if (u) {
        fetchMyList(u);
        fetchSuggestions(u);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchSuggestions = async (u: User) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/suggestions?user_uid=${u.uid}`);
      if (res.ok) setCards(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchMyList = async (u: User) => {
    const token = await u.getIdToken();
    const res = await fetch(`${API_URL}/api/activities`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setMyList(await res.json());
  };

  const handleSwipeRight = async (card: any) => {
    setCards(prev => prev.filter(c => c.id !== card.id));
    // Optimistic UI
    setMyList(prev => [{ ...card, is_completed: false }, ...prev]);
    
    if (user) {
      const token = await user.getIdToken();
      await fetch(`${API_URL}/api/activities`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title: card.title, description: card.desc, image_url: card.image_url })
      });
    }
  };

  const toggleComplete = async (item: any) => {
    // Đánh dấu hoàn thành (Achievement)
    const newStatus = !item.is_completed;
    setMyList(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: newStatus } : i));

    if (user) {
      const token = await user.getIdToken();
      await fetch(`${API_URL}/api/activities/${item.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: newStatus })
      });
    }
  };

  // --- SUB COMPONENT: IMAGE CARD ---
  const Card = ({ data, onSwipe }: { data: any, onSwipe: (dir: 'left' | 'right') => void }) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    return (
      <motion.div
        style={{ x, rotate, opacity }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 100) onSwipe('right');
          else if (info.offset.x < -100) onSwipe('left');
        }}
        className="absolute top-0 w-full h-full rounded-3xl shadow-2xl cursor-grab overflow-hidden bg-black"
      >
        {/* HÌNH ẢNH FULL MÀN HÌNH (Visual) */}
        <img src={data.image_url} className="w-full h-full object-cover opacity-90" />
        
        {/* Gradient Overlay để đọc chữ cho rõ */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-transparent to-transparent h-1/2 p-6 flex flex-col justify-end text-white">
          <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">{data.title}</h2>
          <p className="text-gray-200 text-lg drop-shadow-md">{data.desc}</p>
        </div>

        {/* Nhãn Like/Nope */}
        <motion.div style={{ opacity: useTransform(x, [50, 150], [0, 1]) }} className="absolute top-8 left-8 border-4 border-green-400 text-green-400 font-bold text-4xl px-4 py-2 rounded transform -rotate-12 bg-black/20 backdrop-blur-sm">CHỐT</motion.div>
        <motion.div style={{ opacity: useTransform(x, [-150, -50], [1, 0]) }} className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-bold text-4xl px-4 py-2 rounded transform rotate-12 bg-black/20 backdrop-blur-sm">BỎ</motion.div>
      </motion.div>
    );
  };

  // --- LOGIN SCREEN ---
  if (!user) return (
    <div className="h-screen w-full bg-black flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <img src="https://image.pollinations.ai/prompt/abstract-neon-city?nologo=true" className="absolute inset-0 w-full h-full object-cover opacity-50" />
      <div className="z-10 text-center text-white">
        <h1 className="text-6xl font-black mb-4 tracking-tighter">GO<span className="text-pink-500">NEXT</span></h1>
        <p className="text-xl mb-8 font-light">Khám phá thế giới của riêng bạn.</p>
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-white text-black px-8 py-3 rounded-full font-bold text-lg hover:scale-105 transition-transform">
          Bắt đầu ngay
        </button>
      </div>
    </div>
  );

  const doneCount = myList.filter(i => i.is_completed).length;

  return (
    <div className="flex justify-center min-h-screen bg-gray-900 font-sans">
      <div className="w-full max-w-md h-[100dvh] bg-gray-50 flex flex-col relative md:h-[850px] md:rounded-[40px] md:my-auto overflow-hidden">
        
        {/* HEADER */}
        <header className="px-6 py-4 bg-white/80 backdrop-blur-md flex justify-between items-center z-20 sticky top-0 border-b border-gray-100">
          <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            {activeTab === 'SWIPE' ? 'Gợi ý cho bạn' : activeTab === 'LIST' ? 'Hành trình' : 'Hồ sơ'}
          </h1>
          <img src={user.photoURL || ''} className="w-8 h-8 rounded-full ring-2 ring-purple-500" />
        </header>

        <main className="flex-1 relative overflow-hidden bg-gray-100">
          
          {/* TAB 1: SWIPE (Ảnh đẹp) */}
          {activeTab === 'SWIPE' && (
            <div className="h-full w-full flex flex-col items-center justify-center p-4">
              <div className="relative w-full h-[65vh] max-w-sm">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                    <Loader2 size={48} className="animate-spin text-pink-500" />
                    <p>AI đang tìm ý tưởng xịn...</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {cards.length > 0 ? (
                      cards.map((card, index) => {
                        if (index < cards.length - 2) return null;
                        return <Card key={card.id} data={card} onSwipe={(dir) => dir === 'right' ? handleSwipeRight(card) : setCards(p => p.filter(c => c.id !== card.id))} />
                      })
                    ) : (
                       <div className="text-center">
                          <h3 className="text-xl font-bold text-gray-800 mb-4">Hết ý tưởng rồi?</h3>
                          <button onClick={() => fetchSuggestions(user)} className="px-6 py-3 bg-black text-white rounded-full font-bold shadow-lg active:scale-95 transition-transform">
                            Lấy thêm gợi ý
                          </button>
                       </div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ACHIEVEMENT LIST (Danh sách thành tựu) */}
          {activeTab === 'LIST' && (
            <div className="h-full overflow-y-auto p-4 space-y-6 pb-24">
              
              {/* Mục 1: Đang hứng thú */}
              <div>
                <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider mb-3 ml-1">Đang hứng thú ({myList.filter(i => !i.is_completed).length})</h3>
                <div className="space-y-3">
                  {myList.filter(i => !i.is_completed).map(item => (
                    <motion.div layout key={item.id} className="bg-white p-3 rounded-2xl shadow-sm flex gap-3 items-center">
                      <img src={item.image_url} className="w-16 h-16 rounded-xl object-cover bg-gray-200" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 truncate">{item.title}</h4>
                        <p className="text-xs text-gray-500 truncate">{item.description}</p>
                      </div>
                      <button onClick={() => toggleComplete(item)} className="p-2 bg-gray-100 rounded-full hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors">
                        <CheckCircle2 size={24} />
                      </button>
                    </motion.div>
                  ))}
                  {myList.filter(i => !i.is_completed).length === 0 && <p className="text-center text-gray-400 text-sm py-4">Chưa lưu hoạt động nào.</p>}
                </div>
              </div>

              {/* Mục 2: Bộ sưu tập (Achievement) */}
              <div>
                <h3 className="font-bold text-green-600 text-sm uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                   <Trophy size={16}/> Bộ sưu tập ({doneCount})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {myList.filter(i => i.is_completed).map(item => (
                    <motion.div layout key={item.id} className="relative aspect-square rounded-2xl overflow-hidden shadow-md group">
                      <img src={item.image_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => toggleComplete(item)} className="bg-white/20 backdrop-blur p-2 rounded-full text-white"><X size={20}/></button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white text-xs font-bold truncate">{item.title}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: PROFILE */}
          {activeTab === 'PROFILE' && (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-white">
               <img src={user.photoURL || ''} className="w-24 h-24 rounded-full border-4 border-gray-100 mb-4" />
               <h2 className="text-2xl font-bold">{user.displayName}</h2>
               <div className="flex gap-4 mt-8 w-full">
                  <div className="flex-1 bg-pink-50 p-4 rounded-2xl text-center">
                    <p className="text-3xl font-black text-pink-500">{doneCount}</p>
                    <p className="text-xs text-gray-500 uppercase font-bold">Thành tựu</p>
                  </div>
                  <div className="flex-1 bg-purple-50 p-4 rounded-2xl text-center">
                    <p className="text-3xl font-black text-purple-500">{myList.length}</p>
                    <p className="text-xs text-gray-500 uppercase font-bold">Đã lưu</p>
                  </div>
               </div>
               <button onClick={() => signOut(auth)} className="mt-12 text-red-500 font-bold flex items-center gap-2 px-6 py-3 rounded-full hover:bg-red-50 transition-colors">
                  Đăng xuất
               </button>
            </div>
          )}
        </main>

        <nav className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20 pb-safe">
          <button onClick={() => setActiveTab('SWIPE')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'SWIPE' ? 'text-pink-600' : 'text-gray-300'}`}>
            <Zap size={24} fill={activeTab === 'SWIPE' ? "currentColor" : "none"} />
          </button>
          <button onClick={() => setActiveTab('LIST')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'LIST' ? 'text-pink-600' : 'text-gray-300'}`}>
            <List size={24} strokeWidth={activeTab === 'LIST' ? 3 : 2} />
          </button>
          <button onClick={() => setActiveTab('PROFILE')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'PROFILE' ? 'text-pink-600' : 'text-gray-300'}`}>
            <UserIcon size={24} fill={activeTab === 'PROFILE' ? "currentColor" : "none"} />
          </button>
        </nav>

      </div>
    </div>
  );
}

export default App;