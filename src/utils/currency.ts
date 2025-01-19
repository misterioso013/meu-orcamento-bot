interface ExchangeRate {
  USDBRL: {
    bid: string;
  }
}

export async function convertToStars(priceInBRL: number): Promise<number> {
  try {
    const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const data: ExchangeRate = await response.json();

    const usdBRL = parseFloat(data.USDBRL.bid);
    const priceInUSD = priceInBRL / usdBRL;
    const priceInStars = Math.ceil(priceInUSD / 0.013); // Arredonda para cima

    return priceInStars;
  } catch (error) {
    console.error('Erro ao converter moeda:', error);
    // Fallback para uma taxa fixa em caso de erro na API
    const fixedUSDBRL = 5.0;
    return Math.ceil((priceInBRL / fixedUSDBRL) / 0.013);
  }
}