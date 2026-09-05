import { createD1Repository } from './lib/d1';
import { handlePublicAvailabilityRequest } from './routes/publicAvailability';
import { handlePublicEngagementRequest } from './routes/publicEngagement';
import { handlePublicRequests } from './routes/publicRequests';
import { handlePublicPacksRequest } from './routes/publicPacks';
import { handlePublicServicesRequest } from './routes/publicServices';
import { handleProtectedCatalogRequest } from './routes/protectedCatalog';
import { handleProtectedProductsRequest } from './routes/protectedProducts';
import { handleProtectedInventoryRequest } from './routes/protectedInventory';
import { handleProtectedScentProfilesRequest } from './routes/protectedScentProfiles';
import { handleProtectedCartRequest, handleProtectedCartWithSuppliesRequest } from './routes/protectedCart';
import { handleProtectedMoldsRequest } from './routes/protectedMolds';
import { handleProtectedEmployeesRequest } from './routes/protectedEmployees';
import { handleProtectedRecipesRequest } from './routes/protectedRecipes';
import { handleProtectedBatchLogsRequest } from './routes/protectedBatchLogs';
import { handleProtectedSalesRequest } from './routes/protectedSales';
import { handleProtectedContactMessagesRequest } from './routes/protectedContactMessages';
import { handleProtectedAccountRequest } from './routes/protectedAccount';
import { handleProtectedAuthMeRequest } from './routes/protectedAuthMe';
import { handleProtectedLaunchToolsRequest } from './routes/protectedLaunchTools';
import { handleProtectedStorefrontFeaturesRequest } from './routes/protectedStorefrontFeatures';
import { handleProtectedStorefrontServicesRequest } from './routes/protectedStorefrontServices';
import { handlePublicStoreRequest } from './routes/publicStore';
import { handlePublicPickupRequest } from './routes/publicPickup';
import { handleProtectedStorefrontPickupRequest } from './routes/protectedStorefrontPickup';
import { handleProtectedStorefrontSubscriptionsRequest } from './routes/protectedStorefrontSubscriptions';
import { handlePublicSubscriptionsRequest } from './routes/publicSubscriptions';
import { handleProtectedStorefrontMembershipRequest } from './routes/protectedStorefrontMembership';
import { handleProtectedStorefrontModerationRequest } from './routes/protectedStorefrontModeration';
import { handlePublicGalleryRequest } from './routes/publicGallery';
import { handleProtectedStorefrontRewardsRequest } from './routes/protectedStorefrontRewards';
import { handleProtectedStorefrontBalancesRequest } from './routes/protectedStorefrontBalances';
import { handleProtectedStorefrontDiscountsRequest } from './routes/protectedStorefrontDiscounts';
import { handleProtectedStorefrontOrdersRequest } from './routes/protectedStorefrontOrders';
import { handleProtectedStorefrontConfigRequest } from './routes/protectedStorefrontConfig';
import { handleStorefrontMediaRequest } from './routes/storefrontMedia';
import { handlePublicCustomerAuthRequest } from './routes/publicCustomerAuth';
import { handlePublicCustomerAccountRequest } from './routes/publicCustomerAccount';
import { handlePublicCustomerEngagementRequest } from './routes/publicCustomerEngagement';
import { handlePublicCustomerCommerceRequest } from './routes/publicCustomerCommerce';
import { handlePublicGiftRegistryRequest } from './routes/publicGiftRegistry';
import { handlePublicCheckoutConfigRequest } from './routes/publicCheckoutConfig';
import { handlePublicCheckoutRequest } from './routes/publicCheckout';
import { handlePublicCheckoutPaymentRequest } from './routes/publicCheckoutPayments';
import { handleProtectedStorefrontRefundRequest } from './routes/protectedStorefrontRefunds';
import { handlePaymentWebhookRequest } from './routes/paymentWebhooks';
import { handlePublicAuthRequest } from './routes/publicAuth';
import { handleProtectedTeamAccessRequest } from './routes/protectedTeamAccess';
import { handleProtectedTeamRolesRequest } from './routes/protectedTeamRoles';
import { handlePublicAppealsRequest } from './routes/publicAppeals';
import { handleBillingBasicRequest } from './routes/billingBasic';
import { handleBillingPaidRequest } from './routes/billingPaid';
import { handleSuperAdminRequest } from './routes/superAdmin';
import { deliverStoreEmail, type EmailOutboxMessage, type EmailOutboxQueue } from './lib/emailOutbox';

export interface Env {
  ASSETS: Fetcher;
  APP_ORIGIN?: string;
  DB?: D1Database;
  STORE_MEDIA?: R2Bucket;
  SQUARE_APPLICATION_ID?: string; SQUARE_LOCATION_ID?: string; SQUARE_ACCESS_TOKEN?: string; SQUARE_ENVIRONMENT?: string;
  PAYPAL_CLIENT_ID?: string; PAYPAL_CLIENT_SECRET?: string; PAYPAL_ENVIRONMENT?: string;
  SQUARE_WEBHOOK_SIGNATURE_KEY?: string; SQUARE_WEBHOOK_URL?: string; PAYPAL_WEBHOOK_ID?: string;
  EMAIL_OUTBOX?: EmailOutboxQueue; EMAIL_DELIVERY_URL?: string; EMAIL_DELIVERY_TOKEN?: string;
  SUPERADMIN_EMAIL?: string; SUPERADMIN_PASSWORD?: string;
}

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // This endpoint verifies the deployed Worker shell without exposing secrets.
    if (url.pathname === '/api/health') {
      return json({
        status: 'ok',
        runtime: 'cloudflare-worker',
        migration: env.DB ? 'identity-schema-ready' : 'foundation-only',
        bindings: {
          d1: Boolean(env.DB),
          r2: Boolean(env.STORE_MEDIA),
        },
      });
    }

    if (url.pathname === '/api/cloud/status') {
      return json({
        worker: 'ready',
        d1: env.DB ? 'configured' : 'not configured',
        repository: env.DB ? Boolean(createD1Repository(env.DB)) : false,
        routesMigrated: false,
      });
    }

    const paymentWebhookResponse = await handlePaymentWebhookRequest(request, env.DB, { squareWebhookSignatureKey: env.SQUARE_WEBHOOK_SIGNATURE_KEY, squareWebhookUrl: env.SQUARE_WEBHOOK_URL, paypalWebhookId: env.PAYPAL_WEBHOOK_ID, paypalClientId: env.PAYPAL_CLIENT_ID, paypalClientSecret: env.PAYPAL_CLIENT_SECRET, paypalEnvironment: env.PAYPAL_ENVIRONMENT });
    if (paymentWebhookResponse) return paymentWebhookResponse;
    const publicAuthResponse = await handlePublicAuthRequest(request, env.DB);
    if (publicAuthResponse) return publicAuthResponse;
    const superAdminResponse = await handleSuperAdminRequest(request, env.DB, { email: env.SUPERADMIN_EMAIL, password: env.SUPERADMIN_PASSWORD });
    if (superAdminResponse) return superAdminResponse;
    const publicAppealsResponse = await handlePublicAppealsRequest(request, env.DB);
    if (publicAppealsResponse) return publicAppealsResponse;
    const billingBasicResponse = await handleBillingBasicRequest(request, env.DB, { squareApplicationId: env.SQUARE_APPLICATION_ID, squareLocationId: env.SQUARE_LOCATION_ID, squareAccessToken: env.SQUARE_ACCESS_TOKEN, paypalClientId: env.PAYPAL_CLIENT_ID, paypalClientSecret: env.PAYPAL_CLIENT_SECRET });
    if (billingBasicResponse) return billingBasicResponse;
    const billingPaidResponse = await handleBillingPaidRequest(request, env.DB, { squareAccessToken: env.SQUARE_ACCESS_TOKEN, squareLocationId: env.SQUARE_LOCATION_ID, squareEnvironment: env.SQUARE_ENVIRONMENT, paypalClientId: env.PAYPAL_CLIENT_ID, paypalClientSecret: env.PAYPAL_CLIENT_SECRET, paypalEnvironment: env.PAYPAL_ENVIRONMENT });
    if (billingPaidResponse) return billingPaidResponse;

    const storefrontMediaResponse = await handleStorefrontMediaRequest(request, env.DB, env.STORE_MEDIA);
    if (storefrontMediaResponse) return storefrontMediaResponse;

    const publicStoreResponse = await handlePublicStoreRequest(request, env.DB);
    if (publicStoreResponse) return publicStoreResponse;
    const publicCustomerAuthResponse = await handlePublicCustomerAuthRequest(request, env.DB);
    if (publicCustomerAuthResponse) return publicCustomerAuthResponse;
    const publicCustomerAccountResponse = await handlePublicCustomerAccountRequest(request, env.DB);
    if (publicCustomerAccountResponse) return publicCustomerAccountResponse;
    const publicCustomerEngagementResponse = await handlePublicCustomerEngagementRequest(request, env.DB);
    if (publicCustomerEngagementResponse) return publicCustomerEngagementResponse;
    const publicCustomerCommerceResponse = await handlePublicCustomerCommerceRequest(request, env.DB);
    if (publicCustomerCommerceResponse) return publicCustomerCommerceResponse;
    const publicGiftRegistryResponse = await handlePublicGiftRegistryRequest(request, env.DB);
    if (publicGiftRegistryResponse) return publicGiftRegistryResponse;
    const publicCheckoutConfigResponse = await handlePublicCheckoutConfigRequest(request, env.DB, { squareApplicationId: env.SQUARE_APPLICATION_ID, squareLocationId: env.SQUARE_LOCATION_ID, squareAccessToken: env.SQUARE_ACCESS_TOKEN, paypalClientId: env.PAYPAL_CLIENT_ID, paypalClientSecret: env.PAYPAL_CLIENT_SECRET });
    if (publicCheckoutConfigResponse) return publicCheckoutConfigResponse;
    const publicCheckoutPaymentResponse = await handlePublicCheckoutPaymentRequest(request, env.DB, { squareAccessToken: env.SQUARE_ACCESS_TOKEN, squareLocationId: env.SQUARE_LOCATION_ID, squareEnvironment: env.SQUARE_ENVIRONMENT, paypalClientId: env.PAYPAL_CLIENT_ID, paypalClientSecret: env.PAYPAL_CLIENT_SECRET, paypalEnvironment: env.PAYPAL_ENVIRONMENT, emailOutbox: env.EMAIL_OUTBOX });
    if (publicCheckoutPaymentResponse) return publicCheckoutPaymentResponse;
    const publicCheckoutResponse = await handlePublicCheckoutRequest(request, env.DB, env.EMAIL_OUTBOX);
    if (publicCheckoutResponse) return publicCheckoutResponse;

    const publicPickupResponse = await handlePublicPickupRequest(request, env.DB);
    if (publicPickupResponse) return publicPickupResponse;

    const publicSubscriptionsResponse = await handlePublicSubscriptionsRequest(request, env.DB);
    if (publicSubscriptionsResponse) return publicSubscriptionsResponse;
    const publicGalleryResponse = await handlePublicGalleryRequest(request, env.DB);
    if (publicGalleryResponse) return publicGalleryResponse;

    const publicEngagementResponse = await handlePublicEngagementRequest(request, env.DB);
    if (publicEngagementResponse) return publicEngagementResponse;

    const publicAvailabilityResponse = await handlePublicAvailabilityRequest(request, env.DB);
    if (publicAvailabilityResponse) return publicAvailabilityResponse;

    const publicRequestResponse = await handlePublicRequests(request, env.DB);
    if (publicRequestResponse) return publicRequestResponse;

    const publicPacksResponse = await handlePublicPacksRequest(request, env.DB);
    if (publicPacksResponse) return publicPacksResponse;

    const publicServicesResponse = await handlePublicServicesRequest(request, env.DB);
    if (publicServicesResponse) return publicServicesResponse;

    const protectedCatalogResponse = await handleProtectedCatalogRequest(request, env.DB);
    if (protectedCatalogResponse) return protectedCatalogResponse;

    const protectedProductsResponse = await handleProtectedProductsRequest(request, env.DB);
    if (protectedProductsResponse) return protectedProductsResponse;

    const protectedInventoryResponse = await handleProtectedInventoryRequest(request, env.DB);
    if (protectedInventoryResponse) return protectedInventoryResponse;

    const protectedScentProfilesResponse = await handleProtectedScentProfilesRequest(request, env.DB);
    if (protectedScentProfilesResponse) return protectedScentProfilesResponse;

    const protectedCartWithSuppliesResponse = await handleProtectedCartWithSuppliesRequest(request, env.DB);
    if (protectedCartWithSuppliesResponse) return protectedCartWithSuppliesResponse;

    const protectedCartResponse = await handleProtectedCartRequest(request, env.DB);
    if (protectedCartResponse) return protectedCartResponse;

    const protectedMoldsResponse = await handleProtectedMoldsRequest(request, env.DB);
    if (protectedMoldsResponse) return protectedMoldsResponse;

    const protectedEmployeesResponse = await handleProtectedEmployeesRequest(request, env.DB);
    if (protectedEmployeesResponse) return protectedEmployeesResponse;

    const protectedRecipesResponse = await handleProtectedRecipesRequest(request, env.DB);
    if (protectedRecipesResponse) return protectedRecipesResponse;

    const protectedBatchLogsResponse = await handleProtectedBatchLogsRequest(request, env.DB);
    if (protectedBatchLogsResponse) return protectedBatchLogsResponse;

    const protectedSalesResponse = await handleProtectedSalesRequest(request, env.DB);
    if (protectedSalesResponse) return protectedSalesResponse;

    const protectedContactMessagesResponse = await handleProtectedContactMessagesRequest(request, env.DB);
    if (protectedContactMessagesResponse) return protectedContactMessagesResponse;

    const protectedAccountResponse = await handleProtectedAccountRequest(request, env.DB);
    if (protectedAccountResponse) return protectedAccountResponse;

    const protectedAuthMeResponse = await handleProtectedAuthMeRequest(request, env.DB);
    if (protectedAuthMeResponse) return protectedAuthMeResponse;
    const protectedTeamAccessResponse = await handleProtectedTeamAccessRequest(request, env.DB);
    if (protectedTeamAccessResponse) return protectedTeamAccessResponse;
    const protectedTeamRolesResponse = await handleProtectedTeamRolesRequest(request, env.DB);
    if (protectedTeamRolesResponse) return protectedTeamRolesResponse;

    const protectedLaunchToolsResponse = await handleProtectedLaunchToolsRequest(request, env.DB);
    if (protectedLaunchToolsResponse) return protectedLaunchToolsResponse;

    const protectedStorefrontFeaturesResponse = await handleProtectedStorefrontFeaturesRequest(request, env.DB);
    if (protectedStorefrontFeaturesResponse) return protectedStorefrontFeaturesResponse;

    const protectedStorefrontServicesResponse = await handleProtectedStorefrontServicesRequest(request, env.DB);
    if (protectedStorefrontServicesResponse) return protectedStorefrontServicesResponse;

    const protectedStorefrontPickupResponse = await handleProtectedStorefrontPickupRequest(request, env.DB);
    if (protectedStorefrontPickupResponse) return protectedStorefrontPickupResponse;

    const protectedStorefrontSubscriptionsResponse = await handleProtectedStorefrontSubscriptionsRequest(request, env.DB);
    if (protectedStorefrontSubscriptionsResponse) return protectedStorefrontSubscriptionsResponse;

    const protectedStorefrontMembershipResponse = await handleProtectedStorefrontMembershipRequest(request, env.DB);
    if (protectedStorefrontMembershipResponse) return protectedStorefrontMembershipResponse;
    const protectedStorefrontModerationResponse = await handleProtectedStorefrontModerationRequest(request, env.DB);
    if (protectedStorefrontModerationResponse) return protectedStorefrontModerationResponse;
    const protectedStorefrontRewardsResponse = await handleProtectedStorefrontRewardsRequest(request, env.DB);
    if (protectedStorefrontRewardsResponse) return protectedStorefrontRewardsResponse;
    const protectedStorefrontBalancesResponse = await handleProtectedStorefrontBalancesRequest(request, env.DB);
    if (protectedStorefrontBalancesResponse) return protectedStorefrontBalancesResponse;
    const protectedStorefrontDiscountsResponse = await handleProtectedStorefrontDiscountsRequest(request, env.DB);
    if (protectedStorefrontDiscountsResponse) return protectedStorefrontDiscountsResponse;
    const protectedStorefrontOrdersResponse = await handleProtectedStorefrontOrdersRequest(request, env.DB);
    if (protectedStorefrontOrdersResponse) return protectedStorefrontOrdersResponse;
    const protectedStorefrontRefundResponse = await handleProtectedStorefrontRefundRequest(request, env.DB, { squareAccessToken: env.SQUARE_ACCESS_TOKEN, squareEnvironment: env.SQUARE_ENVIRONMENT, paypalClientId: env.PAYPAL_CLIENT_ID, paypalClientSecret: env.PAYPAL_CLIENT_SECRET, paypalEnvironment: env.PAYPAL_ENVIRONMENT, emailOutbox: env.EMAIL_OUTBOX });
    if (protectedStorefrontRefundResponse) return protectedStorefrontRefundResponse;
    const protectedStorefrontConfigResponse = await handleProtectedStorefrontConfigRequest(request, env.DB);
    if (protectedStorefrontConfigResponse) return protectedStorefrontConfigResponse;

    if (url.pathname.startsWith('/api/')) {
      return json(
        {
          error: 'Cloudflare API migration is not active yet. Continue using the local Express API until the route migration is complete.',
        },
        { status: 503 },
      );
    }

    return env.ASSETS.fetch(request);
  },

  async queue(batch: { messages: Array<{ body: EmailOutboxMessage; ack(): void; retry(): void }> }, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await deliverStoreEmail(env.DB, message.body, { deliveryUrl: env.EMAIL_DELIVERY_URL, deliveryToken: env.EMAIL_DELIVERY_TOKEN });
        message.ack();
      } catch {
        message.retry();
      }
    }
  },
};
