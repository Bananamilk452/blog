"use server";

import { ActorService } from "../services/actor";
import { getValidAdminSession } from "../utils-server";

export async function getMainActor() {
  const actorService = new ActorService();

  return actorService.getMainActor();
}

export async function updateMainActor(
  data: Parameters<ActorService["updateMainActor"]>[0],
) {
  await getValidAdminSession();

  const actorService = new ActorService();

  return actorService.updateMainActor(data);
}
