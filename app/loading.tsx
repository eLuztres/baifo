import LoaderImage from "@/components/shared/LoaderImage";
import { BRAND } from "@/lib/brand";

const LoadingPage = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
      }}
    >
      <LoaderImage image={BRAND.loaderImage} />
    </div>
  );
};

export default LoadingPage;
