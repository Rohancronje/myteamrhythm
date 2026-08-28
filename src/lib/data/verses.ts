// Weekly verse suggestions for the Connect workspace. Theme (as requested):
// PRAISING GOD — declarations of his greatness, goodness, majesty and worth;
// thanksgiving and worship. NOT petition/"help me" or comfort-in-hardship verses.
//
// Text is stored statically (sourced once from bible-api.com, WEB / public domain)
// so there are ZERO API calls at render time: instant, and never rate-limited.
//
// Rotation: each member is assigned a verse by their position WITHIN their team
// plus a week index that ticks over every Monday (NZ). So within a team, no two
// people get the same verse in a given week, and everyone's changes each Monday.

import { nzToday } from "@/lib/time";

export interface Verse {
  reference: string;
  text: string;
}

export const VERSES: Verse[] = [
  { reference: "Psalm 145:3", text: "Great is Yahweh, and greatly to be praised! His greatness is unsearchable." },
  { reference: "Psalm 34:1", text: "I will bless Yahweh at all times. His praise will always be in my mouth." },
  { reference: "Psalm 103:1", text: "Praise Yahweh, my soul! All that is within me, praise his holy name!" },
  { reference: "Psalm 8:1", text: "Yahweh, our Lord, how majestic is your name in all the earth, who has set your glory above the heavens!" },
  { reference: "Psalm 150:6", text: "Let everything that has breath praise Yah! Praise Yah!" },
  { reference: "Psalm 34:3", text: "Oh magnify Yahweh with me. Let us exalt his name together." },
  { reference: "Psalm 100:4-5", text: "Enter into his gates with thanksgiving, into his courts with praise. Give thanks to him, and bless his name. For Yahweh is good. His loving kindness endures forever, his faithfulness to all generations." },
  { reference: "Psalm 95:1-2", text: "Oh come, let’s sing to Yahweh. Let’s shout aloud to the rock of our salvation! Let’s come before his presence with thanksgiving. Let’s extol him with songs!" },
  { reference: "Psalm 145:1-2", text: "I will exalt you, my God, the King. I will praise your name forever and ever. Every day I will praise you. I will extol your name forever and ever." },
  { reference: "Revelation 4:11", text: "“Worthy are you, our Lord and God, the Holy One, to receive the glory, the honor, and the power, for you created all things, and because of your desire they existed, and were created!”" },
  { reference: "Psalm 33:1", text: "Rejoice in Yahweh, you righteous! Praise is fitting for the upright." },
  { reference: "Psalm 9:1-2", text: "I will give thanks to Yahweh with my whole heart. I will tell of all your marvelous works. I will be glad and rejoice in you. I will sing praise to your name, O Most High." },
  { reference: "Psalm 96:4", text: "For great is Yahweh, and greatly to be praised! He is to be feared above all gods." },
  { reference: "Psalm 47:1", text: "Oh clap your hands, all you nations. Shout to God with the voice of triumph!" },
  { reference: "Psalm 113:3", text: "From the rising of the sun to the going down of the same, Yahweh’s name is to be praised." },
  { reference: "Psalm 66:1-2", text: "Make a joyful shout to God, all the earth! Sing to the glory of his name! Offer glory and praise!" },
  { reference: "1 Chronicles 29:11", text: "Yours, Yahweh, is the greatness, the power, the glory, the victory, and the majesty! For all that is in the heavens and in the earth is yours. Yours is the kingdom, Yahweh, and you are exalted as head above all." },
  { reference: "Psalm 92:1", text: "It is a good thing to give thanks to Yahweh, to sing praises to your name, Most High;" },
  { reference: "Psalm 107:1", text: "Give thanks to Yahweh, for he is good, for his loving kindness endures forever." },
  { reference: "Psalm 63:3-4", text: "Because your loving kindness is better than life, my lips shall praise you. So I will bless you while I live. I will lift up my hands in your name." },
  { reference: "Psalm 146:1-2", text: "Praise Yah! Praise Yahweh, my soul. While I live, I will praise Yahweh. I will sing praises to my God as long as I exist." },
  { reference: "Isaiah 25:1", text: "Yahweh, you are my God. I will exalt you! I will praise your name, for you have done wonderful things, things planned long ago, in complete faithfulness and truth." },
  { reference: "Revelation 5:12", text: "Worthy is the Lamb who has been killed to receive the power, wealth, wisdom, strength, honor, glory, and blessing!" },
  { reference: "Psalm 96:1", text: "Sing to Yahweh a new song! Sing to Yahweh, all the earth." },
  { reference: "Psalm 105:1", text: "Give thanks to Yahweh! Call on his name! Make his doings known among the peoples." },
  { reference: "Psalm 30:12", text: "To the end that my heart may sing praise to you, and not be silent. Yahweh my God, I will give thanks to you forever!" },
  { reference: "Psalm 89:1", text: "I will sing of the loving kindness of Yahweh forever. With my mouth, I will make known your faithfulness to all generations." },
  { reference: "Psalm 145:21", text: "My mouth will speak the praise of Yahweh. Let all flesh bless his holy name forever and ever." },
  { reference: "Hebrews 13:15", text: "Through him, then, let us offer up a sacrifice of praise to God continually, that is, the fruit of lips which proclaim allegiance to his name." },
  { reference: "Psalm 111:1", text: "Praise Yah! I will give thanks to Yahweh with my whole heart, in the council of the upright, and in the congregation." },
  { reference: "Psalm 71:8", text: "My mouth shall be filled with your praise, with your honor all day long." },
  { reference: "Ephesians 1:3", text: "Blessed be the God and Father of our Lord Jesus Christ, who has blessed us with every spiritual blessing in the heavenly places in Christ;" },
  { reference: "Psalm 136:1", text: "Give thanks to Yahweh, for he is good; for his loving kindness endures forever." },
  { reference: "Psalm 86:12", text: "I will praise you, Lord my God, with my whole heart. I will glorify your name forever more." },
  { reference: "Psalm 138:1", text: "I will give you thanks with my whole heart. Before the gods, I will sing praises to you." },
  { reference: "Psalm 108:3-4", text: "I will give thanks to you, Yahweh, among the nations. I will sing praises to you among the peoples. For your loving kindness is great above the heavens. Your faithfulness reaches to the skies." },
  { reference: "Psalm 118:28", text: "You are my God, and I will give thanks to you. You are my God, I will exalt you." },
  { reference: "Psalm 96:9", text: "Worship Yahweh in holy array. Tremble before him, all the earth." },
  { reference: "Psalm 145:10", text: "All your works will give thanks to you, Yahweh. Your saints will extol you." },
  { reference: "Psalm 148:13", text: "let them praise Yahweh’s name, for his name alone is exalted. His glory is above the earth and the heavens." },
  { reference: "Psalm 65:1", text: "Praise waits for you, God, in Zion. To you shall vows be performed." },
  { reference: "Psalm 40:5", text: "Many, Yahweh, my God, are the wonderful works which you have done, and your thoughts which are toward us. If I would declare and speak of them, they are more than can be counted." },
  { reference: "2 Samuel 22:47", text: "Yahweh lives! Blessed be my rock! Exalted be God, the rock of my salvation!" },
];

/** Week index that increments every Monday (NZ). 1970-01-05 was a Monday. */
export function weekIndex(): number {
  const MON = Date.parse("1970-01-05T00:00:00Z");
  const today = Date.parse(nzToday() + "T00:00:00Z");
  return Math.floor((today - MON) / (7 * 86_400_000));
}
