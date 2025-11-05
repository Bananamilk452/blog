import { prisma } from "../prisma";

export async function getMainActor() {
  const mainActor = await prisma.mainActor.findFirst({
    include: {
      actor: {
        include: {
          avatar: true,
          banner: true,
        },
      },
    },
  });

  if (!mainActor) {
    throw new Error("Main actor not found");
  }

  return mainActor;
}
