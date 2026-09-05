type Props = {
  carouselViewerSrc: string;
  onClose: () => void;
};

export default function CarouselViewerModal({ carouselViewerSrc, onClose }: Props) {
  if (!carouselViewerSrc) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg border border-gray-300 p-2 max-w-5xl w-full">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 px-3 py-1 rounded bg-gray-900 text-white text-sm"
        >
          Close
        </button>
        <img
          src={carouselViewerSrc}
          alt="Carousel preview"
          className="w-full max-h-[85vh] object-contain rounded"
        />
      </div>
    </div>
  );
}
