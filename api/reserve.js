export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '허용되지 않은 요청 방식입니다.' });
    }

    // 이름(name), 전화번호(phone) 대신 인게임 닉네임(inGameName), 디코 닉네임(discordName)으로 변경
    const { date, inGameName, discordName, gameType } = req.body;
    
    // [보완] 백엔드 필수 유효성 검증 추가 (악의적인 빈 데이터 전송 방지)
    if (!date || !inGameName || !discordName || !gameType) {
        return res.status(400).json({ message: '필수 입력 항목이 누락되었습니다.' });
    }
    
    // 1. 접속 IP 획득 (Vercel 환경 기준 다중 IP 예외 처리)
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP 확인 불가';
    
    // [보완] x-forwarded-for 헤더가 "사용자IP, 프록시IP" 형태로 올 경우 첫 번째 IP만 추출
    if (clientIp && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
    }

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

    // [보완] 역할 ID가 없는 경우를 대비한 안전한 멘션 처리
    const roleMention = targetRoleId ? `<@&${targetRoleId}> ` : '';

    // 3. 디스코드 메시지 구성 (라벨 및 변수 변경)
    const message = {
        content: `${roleMention}님! 새로운 예약이 접수되었습니다. 🎉\n**게임 종류:** ${gameType}\n**인게임 닉네임:** ${inGameName}\n**디스코드 닉네임:** ${discordName}\n**예약일:** ${date}\n🚨 **접속 IP:** ||${clientIp}||`
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
            // 디스코드 측의 에러 로그를 서버에 남겨 디버깅을 용이하게 합니다.
            const errorText = await discordResponse.text();
            console.error("디스코드 웹훅 응답 에러:", errorText);
            return res.status(500).json({ message: '디스코드 전송 실패' });
        }
    } catch (error) {
        console.error("서버 에러:", error);
        return res.status(500).json({ message: '서버 내부 에러' });
    }
}
