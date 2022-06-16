import {
  Bot,
  Context,
  session,
  SessionFlavor,
} from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { freeStorage } from "https://deno.land/x/grammy_storages@v2.0.0/free/src/mod.ts";

import { BOT_TOKEN } from "./constants.ts";

type UserData = {
  firstName?: string;
  lastName?: string;
  xp: number;
  lastMessageAt?: number;
};

interface SessionData {
  // isStarted: boolean;
  users: Record<number, UserData>;
}

type MyContext = Context & SessionFlavor<SessionData>;

export const bot = new Bot<MyContext>(BOT_TOKEN);

bot.use(
  session({
    initial: () => ({ users: {} }),
    storage: freeStorage<SessionData>(bot.token),
  })
);
const groupBot = bot.filter(
  (ctx) => ctx.chat?.type === "supergroup" || ctx.chat?.type === "group"
);

// groupBot.command("start", (ctx) => {
//   if (ctx.session.isStarted) return;
//   ctx.reply("تم تشغيل البوت بنجاح");
//   ctx.session.isStarted = true;
// });
// groupBot.command(
//   "stop",
//   (async (ctx) => {
//     ctx.reply("تم ايقاف البوت بنجاح");
//     ctx.session.isStarted = false;
//   })
// );

// groupBot.use(async (ctx, next) => {
//   if (ctx.session.isStarted) await next();
// });

groupBot.command("xp", getMyXp);
groupBot.callbackQuery("xp", getMyXp);
groupBot.command("sort", viewsortedMembersXp);
groupBot.callbackQuery("sort", viewsortedMembersXp);
// groupBot.command("removexp", (removeXp));

groupBot.on("message", (ctx) => {
  let user =
    ctx.session.users[ctx.from?.id] ??
    initUser(
      {
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name || "",
        id: ctx.from.id,
      },
      ctx
    );

  const isLastMessageLessThanTwoMinutes =
    Math.floor(
      (Date.now() - ctx.session.users[ctx.from.id].lastMessageAt!) / 1000 / 60
    ) < 2;

  if (isLastMessageLessThanTwoMinutes) return;

  let newXp = randomIntFromInterval(2, 10);

  const isDoubleXp = Math.floor(Math.random() * 10) > 8;
  if (isDoubleXp) {
    const text =
      "مبروك! فزت بـ XP اضافي !!!\n عشان تعرف كم صار عندك اضغط على /xp";
    const markup = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "الـ XP", callback_data: "xp" },
            { text: "ترتيب الـ XP", callback_data: "sort" },
          ],
        ],
      },

      reply_to_message_id: ctx.message?.message_id,
    };

    newXp *= 2;
    ctx.reply(text, markup);
  }

  ctx.session.users[ctx.from.id] = {
    xp: (user.xp += newXp),
    firstName: ctx.from?.first_name,
    lastName: ctx.from?.last_name,
    lastMessageAt: Number(new Date()),
  };
});

bot.api.setMyCommands([
  { command: "xp", description: "عرض عداد الـ XP" },
  { command: "sort", description: "ترتيب الـ XP" },
  { command: "removexp", description: "تصفير عداد الـ XP" },
]);

bot.catch((error) => error.ctx.reply("حدث خطأ ما"));
bot.start();

function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getMyXp(ctx: MyContext) {
  const user = ctx.session.users[ctx.from?.id!];
  if (!user)
    ctx.session.users[ctx.from?.id!] = {
      xp: 0,
      firstName: ctx.from?.first_name,
    };
  ctx.reply(`عندك اكس بي هالقد: ${ctx.session.users[ctx.from?.id!].xp}`, {
    reply_markup: {
      inline_keyboard: [[{ text: "عرض ترتيب الـ XP", callback_data: "sort" }]],
    },
    reply_to_message_id: ctx.message?.message_id,
  });
}
function viewsortedMembersXp(ctx: MyContext) {
  const userObject = Object.entries(ctx.session.users);
  const users = userObject.map(([id, user]) => ({ id, ...user }));
  ctx.reply(
    "ترتيب الأعضاء بالاكس بي:\n\n" +
      users
        .sort((a, b) => b.xp - a.xp)
        .map((user, i) => `${i + 1}. ${user.firstName} - ${user.xp} xp.`)
        .join("\n")
  );
}

async function removeXp(ctx: MyContext) {
  ctx.session.users = {};
  ctx.reply("تم تصفير عداد الـ XP", {
    reply_to_message_id: ctx.message?.message_id,
  });
}

function initUser(user: Partial<UserData> & { id: number }, ctx: MyContext) {
  return (ctx.session.users[user.id] = { lastMessageAt: 0, xp: 0, ...user });
}
