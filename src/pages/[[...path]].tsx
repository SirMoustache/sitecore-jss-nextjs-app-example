import { useEffect } from 'react';
import { ParsedUrlQuery } from 'querystring';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import NotFound from 'src/NotFound';
import {
  SitecoreContext,
  ComponentPropsContext,
  handleExperienceEditorFastRefresh,
} from '@sitecore-jss/sitecore-jss-nextjs';
import Layout from 'src/Layout';
import { SitecorePageProps } from 'lib/page-props';
import { sitecorePagePropsFactory, extractPath } from 'lib/page-props-factory';
import { componentFactory } from 'temp/componentFactory';
import { StyleguideSitecoreContextValue } from 'lib/component-props';

import { matchPath } from 'lib/router';

const SitecorePage = ({ notFound, layoutData, componentProps }: SitecorePageProps): JSX.Element => {
  useEffect(() => {
    // Since Experience Editor does not support Fast Refresh need to refresh EE chromes after Fast Refresh finished
    handleExperienceEditorFastRefresh();
  }, []);

  const router = useRouter();
  console.log('router: ', router);

  if (notFound || !layoutData) {
    // Shouldn't hit this (as long as 'notFound' is being returned below), but just to be safe
    return <NotFound />;
  }

  const context: StyleguideSitecoreContextValue = {
    route: layoutData.sitecore.route,
    itemId: layoutData.sitecore.route?.itemId,
    ...layoutData.sitecore.context,
  };

  return (
    <ComponentPropsContext value={componentProps}>
      <SitecoreContext<StyleguideSitecoreContextValue>
        componentFactory={componentFactory}
        context={context}
      >
        <Layout layoutData={layoutData} />
      </SitecoreContext>
    </ComponentPropsContext>
  );
};

type Rewrite = { path: string; to: string[] | string };

const rewrites: Rewrite[] = [{ path: '/blog/:blogId', to: ['styleguide'] }];

const matchRewtites = (url: string): ParsedUrlQuery | null => {
  for (const rewrite of rewrites) {
    const match = matchPath(rewrite.path, url);
    // Path param is in return objrct response of getting data from Layout Service
    // See page-props-factory.ts `extractPath`
    if (match) return { ...match.params, path: rewrite.to };
  }

  return null;
};

// This function gets called at request time on server-side.
export const getServerSideProps: GetServerSideProps = async (context) => {
  // const { resolvedUrl } = context;
  // const match = matchPath('/:foo/:bar', resolvedUrl);
  const path = extractPath(context.params);
  const matchedParams = matchRewtites(path);
  const newContext = {
    ...context,
    params: { ...context.params, ...matchedParams },
  };
  console.log('context.params:', context.params);
  const props = await sitecorePagePropsFactory.create(newContext);

  // Returns custom 404 page with a status code of 404 when notFound: true
  // Note we can't simply return props.notFound due to an issue in Next.js (https://github.com/vercel/next.js/issues/22472)
  const notFound = props.notFound ? { notFound: true } : {};

  return {
    props,
    ...notFound,
  };
};

export default SitecorePage;
