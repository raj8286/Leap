export const getRtcConfig = async (req, res) => {
    const url = `https://${process.env.METERED_PROJECT_NAME}.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`
    try{
        const iceServers = await fetch(url);
        await res.status(201).send(iceServers);
    }
    catch(err) {
        console.error("Error in fetching iceServers", err);
    }
};