import { getMainActor, updateMainActor } from "../models/actor";

export class ActorService {
  userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  getMainActor() {
    return getMainActor();
  }

  updateMainActor(data: Parameters<typeof updateMainActor>[0]) {
    return updateMainActor(data);
  }
}
