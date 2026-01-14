export function orderStatusTemplate({
  name,
  orderId,
  status,
}: {
  name: string;
  orderId: string;
  status: string;
}) {
  return `
    <div style="font-family:Arial">
      <h2>Order Update</h2>
      <p>Hi ${name},</p>
      <p>Your order <b>${orderId}</b> is now <b>${status}</b>.</p>
      <p>Thank you for shopping with Bohosaaz.</p>
    </div>
  `;
}

export function vendorItemStatusTemplate({
  shopName,
  product,
  status,
}: {
  shopName: string;
  product: string;
  status: string;
}) {
  return `
    <div style="font-family:Arial">
      <h2>Item Update</h2>
      <p>${shopName},</p>
      <p>Your product <b>${product}</b> is now <b>${status}</b>.</p>
    </div>
  `;
}
