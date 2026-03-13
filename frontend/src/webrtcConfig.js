export const webrtcConfig = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "a8180570a212d9cb94ccf7f7",
      credential: "Fq5GqbcYoq6L4zXK",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "a8180570a212d9cb94ccf7f7",
      credential: "Fq5GqbcYoq6L4zXK",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "a8180570a212d9cb94ccf7f7",
      credential: "Fq5GqbcYoq6L4zXK",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "a8180570a212d9cb94ccf7f7",
      credential: "Fq5GqbcYoq6L4zXK",
    },
  ],
};
