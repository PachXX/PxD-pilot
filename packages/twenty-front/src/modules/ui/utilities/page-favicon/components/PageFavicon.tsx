import { Helmet } from '@dr.pogodin/react-helmet';

export const PageFavicon = () => {
  return (
    <Helmet>
      <link
        rel="icon"
        type="image/png"
        sizes="48x48"
        href="/branding/pxd-favicon-48.png"
      />
    </Helmet>
  );
};
