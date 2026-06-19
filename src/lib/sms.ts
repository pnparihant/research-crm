export async function sendLoginOtpSms(phone: string, otp: string, userName: string) {
  const res = await fetch("https://arihantapicore.arihantcapital.com/V1/api/Media/sendSMS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": process.env.ARIHANT_SMS_AUTH!,
    },
    body: JSON.stringify([
      {
        UserName: process.env.ARIHANT_SMS_USERNAME!,
        APIkey:   process.env.ARIHANT_SMS_APIKEY!,
        SMSType:  "OTP",
        messages: [
          {
            To:  phone,
            msg: `Dear ${userName}, OTP for Web Login OTP and Modification with Arihant is ${otp} -Arihant`,
          },
        ],
      },
    ]),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SMS API error ${res.status}: ${body}`);
  }

  return res.json();
}
