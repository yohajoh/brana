import { redirect } from "next/navigation";

type ChapaReturnPageProps = {
  searchParams?: {
    tx_ref?: string | string[];
    trx_ref?: string | string[];
    txRef?: string | string[];
    reference?: string | string[];
    status?: string | string[];
  };
};

const readParam = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export default function ChapaReturnPage({ searchParams }: ChapaReturnPageProps) {
  const txRef =
    readParam(searchParams?.tx_ref) ||
    readParam(searchParams?.trx_ref) ||
    readParam(searchParams?.txRef) ||
    readParam(searchParams?.reference);

  const targetParams = new URLSearchParams();
  if (txRef) targetParams.set("tx_ref", txRef);

  const status = readParam(searchParams?.status);
  if (status) targetParams.set("status", status);

  const target = `/dashboard/student/payments${targetParams.toString() ? `?${targetParams.toString()}` : ""}`;
  redirect(target);
}
