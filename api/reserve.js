export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '허용되지 않은 요청 방식입니다.' });
    }

    // 이름(name), 전화번호(phone) 대신 인게임 닉네임(inGameName), 디코 닉네임(discordName)으로 변경
    const { date, inGameName, discordName, gameType } = req.body;
    
    // 1. 접속 IP 획득 (Vercel 환경 기준)
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP 확인 불가';

    // 2. IP 블랙리스트 검사 (BANNED_IPS 환경 변수에 등록된 IP인지 확인)
    const bannedIpsString = process.env.BANNED_IPS || ""; 
    const bannedIps = bannedIpsString.split(',').map(ip => ip.trim()); // 공백 제거

    if (bannedIps.includes(clientIp)) {
        console.log(`[차단됨] 블랙리스트 IP 접근 시도: ${clientIp}`);
        return res.status(403).json({ message: '관리자에 의해 예약 서비스 이용이 차단되었습니다.' });
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const targetRoleId = process.env.DISCORD_ROLE_ID; // (역할 멘션 시 사용)

    if (!webhookUrl) {
        return res.status(500).json({ message: '서버 설정 오류: 웹훅 URL이 없습니다.' });
    }

    // 3. 디스코드 메시지 구성 (라벨 및 변수 변경)
    const message = {
        content: `<@&${targetRoleId}> 님! 새로운 예약이 접수되었습니다. 🎉\n**게임 종류:** ${gameType}\n**인게임 닉네임:** ${inGameName}\n**디스코드 닉네임:** ${discordName}\n**예약일:** ${date}\n🚨 **접속 IP:** ||${clientIp}||`
    };

    // 4. 디스코드로 데이터 전송
    try {
        const discordResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message)
        });

        if (discordResponse.ok) {
            return res.status(200).json({ message: '성공' });
        } else {
            return res.status(500).json({ message: '디스코드 전송 실패' });
        }
    } catch (error) {
        console.error("서버 에러:", error);
        return res.status(500).json({ message: '서버 내부 에러' });
    }
}
