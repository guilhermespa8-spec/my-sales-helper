import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

export interface ReceiptData {
  number: string;
  date: string;
  seller?: string;
  paymentMethod?: string;
  pieceType?: string;
  discount: number;
  total: number;
  items: { product_name: string; quantity: number; unit_price: number }[];
}

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export const Receipt = ({ data, onClose }: { data: ReceiptData; onClose: () => void }) => {
  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto print:static print:overflow-visible">
      <style>{`@media print{body *{visibility:hidden}#recibo,#recibo *{visibility:visible}#recibo{position:absolute;inset:0;width:80mm;margin:0;padding:4mm}.no-print{display:none!important}@page{size:80mm auto;margin:0}}`}</style>

      <div className="no-print sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <span className="font-display text-lg">Orçamento salvo</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" /> Fechar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        </div>
      </div>

      <div
        id="recibo"
        className="mx-auto my-6 w-[80mm] bg-card p-4 text-foreground border border-border print:border-0"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }}
      >
        <p className="text-center font-bold text-base">AUTO PEÇAS</p>
        <p className="text-center">Orçamento nº {data.number}</p>
        <p className="text-center">{data.date}</p>
        <p className="my-2 border-t border-dashed border-foreground/40" />
        {data.items.map((i, n) => (
          <div key={n} className="mb-1">
            <p className="break-words">{i.product_name}</p>
            <div className="flex justify-between">
              <span>
                {i.quantity} x {brl(i.unit_price)}
              </span>
              <span>{brl(i.quantity * i.unit_price)}</span>
            </div>
          </div>
        ))}
        <p className="my-2 border-t border-dashed border-foreground/40" />
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{brl(subtotal)}</span>
        </div>
        {data.discount > 0 && (
          <div className="flex justify-between">
            <span>Desconto</span>
            <span>-{brl(data.discount)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between text-base font-bold">
          <span>TOTAL</span>
          <span>{brl(data.total)}</span>
        </div>
        <p className="my-2 border-t border-dashed border-foreground/40" />
        {data.paymentMethod && <p>Pagamento: {data.paymentMethod}</p>}
        {data.pieceType && <p>Tipo: {data.pieceType}</p>}
        {data.seller && <p>Vendedor: {data.seller}</p>}
        <p className="mt-3 text-center">Obrigado pela preferência!</p>
      </div>
    </div>
  );
};

export default Receipt;
