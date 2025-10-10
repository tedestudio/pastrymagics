"use client";

import { useEffect, useState, useRef } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

type Order = {
  id: string;
  order_number: string;
  name: string;
  phone: string;
  table_number?: string;
  items: OrderItem[];
  status: "placed" | "preparing" | "ready" | "completed" | "cancelled";
  total: number;
  created_at: string;
  payment: "pay-at-counter";
};

type Props = {
  order: Order;
};

export default function OrderActions({ order }: Props) {
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [canCancel, setCanCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (order.status === "cancelled") {
      setCanCancel(false);
      return;
    }
    const ageInSeconds =
      (Date.now() - new Date(order.created_at).getTime()) / 1000;
    const initialTimeLeft = Math.max(0, 30 - ageInSeconds);
    setTimeRemaining(initialTimeLeft);

    if (initialTimeLeft > 0) {
      setCanCancel(true);
      const timer = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            setCanCancel(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [order.created_at, order.status]);

  const handleCancelOrder = async () => {
    if (!canCancel || isCancelling) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/cancel?id=${order.id}`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Order successfully cancelled. The page will now refresh.");
        window.location.reload();
      } else {
        alert("Failed to cancel order.");
      }
    } catch {
      alert("An error occurred while trying to cancel the order.");
    } finally {
      setIsCancelling(false);
      setCanCancel(false);
    }
  };

  const downloadInvoice = () => {
    const element = document.querySelector("main");
    if (!element) return;

    const opt = {
      margin: 0,
      filename: `invoice-${order.order_number}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait" as "portrait" | "landscape",
      },
    };

    html2pdf()
      .set(opt as any)
      .from(element)
      .save();
  };

  if (order.status === "cancelled") {
    return (
      <div className="p-4 bg-red-100 border border-red-400 rounded-md text-red-700 text-sm">
        This order has been cancelled.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          className="px-4 py-2 rounded-full bg-[var(--primary)] text-white text-sm hover:bg-[var(--primary-600)]"
          onClick={() => {
            if (typeof window === "undefined") return;
            navigator.share?.({
              title: "Pastry Magiccs Order",
              url: window.location.href,
            });
          }}
        >
          Share
        </button>
        {/* <button
          className="px-4 py-2 rounded-full border border-[var(--muted)] text-sm hover:bg-[var(--muted)]/50"
          onClick={downloadInvoice}
        >
          Download Invoice (PDF)
        </button> */}
      </div>

      {canCancel && (
        <div className="flex items-center gap-2">
          <button
            disabled={!canCancel || isCancelling}
            onClick={handleCancelOrder}
            className={`relative overflow-hidden w-40 px-4 py-2 rounded-full border text-sm text-white ${
              !canCancel
                ? "bg-gray-400 border-gray-400"
                : "bg-red-500 border-red-500 hover:bg-red-600"
            }`}
          >
            <div
              className={`absolute top-0 left-0 h-full bg-red-600 transition-all duration-1000 ease-linear ${
                canCancel ? "" : "hidden"
              }`}
              style={{ width: `${(timeRemaining / 30) * 100}%` }}
            ></div>
            <span className="relative z-10">
              {isCancelling
                ? "Cancelling..."
                : `Cancel Order (${Math.ceil(timeRemaining)})`}
            </span>
          </button>
        </div>
      )}

      <div
        ref={invoiceRef}
        className="p-8 w-[210mm] h-[297mm] bg-white text-black print:block"
        style={{ display: "none" }}
      >
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Logo" className="w-24 h-24 mb-2" />
          <h1 className="text-2xl font-bold">Pastry Magiccs</h1>
          <p className="text-sm text-center">123 Baker Street, Sweet City</p>
          <p className="text-sm text-center">+91-00000 00000</p>
        </div>

        <div className="border-t border-gray-300 pt-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">Invoice #{order.order_number}</h2>
            <span className="text-sm">
              Date: {new Date(order.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <p>Customer Name: {order.name}</p>
            <p>Phone: {order.phone}</p>
          </div>
          {order.table_number && (
            <div className="text-sm">
              <p>Table Number: {order.table_number}</p>
            </div>
          )}
        </div>

        <table className="w-full text-left text-sm mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 font-bold">Item</th>
              <th className="p-2 font-bold text-center">Qty</th>
              <th className="p-2 font-bold text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="p-2">{item.name}</td>
                <td className="p-2 text-center">{item.qty}</td>
                <td className="p-2 text-right">
                  ₹{(item.price * item.qty).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-gray-300 pt-4 flex flex-col items-end">
          <div className="flex justify-between w-full max-w-xs text-lg font-bold mb-2">
            <span>Total:</span>
            <span>₹{order.total.toFixed(2)}</span>
          </div>
          <div className="text-sm">Payment Method: Pay at Counter</div>
        </div>

        <p className="text-xs text-center mt-8">Thank you for your business!</p>
      </div>
    </div>
  );
}
