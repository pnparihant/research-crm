export async function sendLoginOtpSms(phone: string, otp: string, userName: string) {
  console.log(`[sms] sendLoginOtpSms — to=${phone} user="${userName}"`);
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
    console.error(`[sms] sendLoginOtpSms FAIL — status=${res.status} body=${body}`);
    throw new Error(`SMS API error ${res.status}: ${body}`);
  }

  const result = await res.json();
  console.log(`[sms] sendLoginOtpSms — sent successfully to ${phone}`);
  return result;
}
