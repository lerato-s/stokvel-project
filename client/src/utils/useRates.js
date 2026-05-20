import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL;

export function useRates() {
  const [rates, setRates] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/rates`)
      .then((res) => res.json())
      .then((data) => setRates(data))
      .catch(() => setRates(null));
  }, []);

  return rates;
}