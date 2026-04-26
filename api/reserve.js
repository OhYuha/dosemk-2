export default async function handler(req, res) {
    // POST 요청이 아니면 튕겨냅니다.
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '허용되지 않은 요청 방식입니다.' });
    }

    const { date, name } = req.body;

    // Vercel 설정에서 입력해둘 환경 변수(비밀번호 같은 역할)를 불러옵니다.
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const targetUserId = process.env.DISCORD_USER_ID;

    const message = {
        content: `<@${targetUserId}> 님! 새로운 예약이 접수되었습니다. 🎉\n**예약자:** ${name}\n**예약일:** ${date}\n**디코:** ${discord}`
    };

    try {
        const discordResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        if (discordResponse.ok) {
            return res.status(200).json({ message: '예약 성공' });
        } else {
            return res.status(500).json({ message: '서버 에러 발생' });
        }
    } catch (error) {
        return res.status(500).json({ message: '서버 에러 발생' });
    }
}