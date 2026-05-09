"use client";

import { forwardRef } from "react";

const ReceiptTemplate = forwardRef(function ReceiptTemplate(
  { order, branch },
  ref
) {
  if (!order) return null;

  return (
    <div
      ref={ref}
      className="w-[300px] bg-white p-4 text-black text-xs font-mono"
    >
      <div className="text-center mb-3">
        <p className="text-base font-bold">Jomaa&apos;s Pizza &amp; Donair</p>
        <p>{branch}</p>
        <p className="text-[10px] text-gray-500">
          {new Date(order.createdAt).toLocaleString()}
        </p>
        <p className="text-[10px]">
          Order #{String(order._id).slice(-6).toUpperCase()}
        </p>
        {order.tableNumber && (
          <p className="text-[10px] font-bold">Table {order.tableNumber}</p>
        )}
      </div>
      <hr className="border-dashed border-gray-300 my-2" />
      {order._items?.map((item, idx) => (
        <div key={idx} className="py-0.5">
          <div className="flex justify-between">
            <span>
              {item.qty}x {item.name}
              {item.size && ` (${item.size})`}
            </span>
            <span>${(item.price * item.qty).toFixed(2)}</span>
          </div>
          {item.infoPizza && (
            <div className="pl-4 text-[10px] text-gray-600">
              {[
                item.infoPizza.crustOption,
                item.infoPizza.cheeseOption,
                item.infoPizza.sauceOption,
              ]
                .filter(Boolean)
                .join(" \u00B7 ")}
              {item.infoPizza.extraToppings?.length ? (
                <div>+ {item.infoPizza.extraToppings.join(", ")}</div>
              ) : null}
            </div>
          )}
        </div>
      ))}
      <hr className="border-dashed border-gray-300 my-2" />
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>${order._subtotal?.toFixed(2)}</span>
      </div>
      {order._discount > 0 && (
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-${order._discount?.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Tax (5%)</span>
        <span>${order._tax?.toFixed(2)}</span>
      </div>
      {(order?._deliveryFee || 0) > 0 && (
        <div className="flex justify-between">
          <span>Delivery Fee</span>
          <span>${order._deliveryFee?.toFixed(2)}</span>
        </div>
      )}
      {order._tip > 0 && (
        <div className="flex justify-between">
          <span>Tip</span>
          <span>${order._tip?.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-sm mt-1">
        <span>TOTAL</span>
        <span>${order._grandTotal?.toFixed(2)}</span>
      </div>
      <hr className="border-dashed border-gray-300 my-2" />
      <div className="flex justify-between">
        <span>Payment</span>
        <span className="capitalize">{order._paymentMethod}</span>
      </div>
      {order._paymentMethod === "cash" && (
        <>
          <div className="flex justify-between">
            <span>Tendered</span>
            <span>${order._tendered?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Change</span>
            <span>${order._change?.toFixed(2)}</span>
          </div>
        </>
      )}
      {order._paymentMethod === "split" && (
        <>
          <div className="flex justify-between">
            <span>Cash</span>
            <span>${(order._splitCash || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Card</span>
            <span>${(order._splitCard || 0).toFixed(2)}</span>
          </div>
        </>
      )}
      <div className="text-center mt-3 text-[10px] text-gray-500">
        <p>Thank you for visiting!</p>
      </div>
    </div>
  );
});

export default ReceiptTemplate;
