import { Button } from "./components/ui/Button";
import { Slider } from "./components/ui/Slider";
import { Modal } from "./components/ui/Modal";
import { Spinner } from "./components/ui/Spinner";
import { useState } from "react";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Parallax - 視差画像作成</h1>

      <div className="space-y-8">
        {/* Button */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Button</h2>
          <div className="flex gap-4">
            <Button onClick={() => alert("クリック")}>ボタン</Button>
            <Button disabled>無効なボタン</Button>
          </div>
        </section>

        {/* Slider */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Slider</h2>
          <Slider
            value={sliderValue}
            onChange={setSliderValue}
            min={0}
            max={100}
          />
          <p className="mt-2">値: {sliderValue}</p>
        </section>

        {/* Modal */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Modal</h2>
          <Button onClick={() => setIsModalOpen(true)}>モーダルを開く</Button>
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <h3 className="text-lg font-semibold mb-4">モーダルタイトル</h3>
            <p>モーダルの内容がここに表示されます。</p>
          </Modal>
        </section>

        {/* Spinner */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Spinner</h2>
          <Spinner />
        </section>
      </div>
    </div>
  );
}

export default App;
