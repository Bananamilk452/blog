import { ActorService } from "../services/actor";

export function getMainActor() {
  const actorService = new ActorService();

  return actorService.getMainActor();
}
