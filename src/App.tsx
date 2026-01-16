import { useAppStore } from "./store/useAppStore";
import { ImageUploader } from "./components/upload/ImageUploader";
import { ImagePreview } from "./components/upload/ImagePreview";

function App() {
  const { originalImage, error } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 p-4">
        <h1 className="text-2xl font-bold text-center">
          Parallax - 視差画像作成
        </h1>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error.message}
          </div>
        )}

        {originalImage ? <ImagePreview /> : <ImageUploader />}
      </main>

      <footer className="border-t border-gray-800 p-4 text-center text-sm text-gray-500">
        すべての処理はブラウザ内で完結します
      </footer>
    </div>
  );
}

export default App;
