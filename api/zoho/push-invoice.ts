import { handleZohoRequest } from './[...path]';

export default function handler(req: any, res: any) {
  return handleZohoRequest(req, res, 'push-invoice');
}
