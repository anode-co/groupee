/*@flow*/

/*::
type Message_t = {
  event: string,
  data: {
    channel_display_name: string,
    channel_name: string,
    channel_type: string,
    mentions: string,
    post: string,
    sender_name: string,
    set_online: bool,
    team_id: string,
  },
  broadcast: {
    omit_users: null,
    user_id: string,
    channel_id: string,
    team_id: string
  },
  seq: number,
  _post: {
      id: string,
      create_at: number,
      update_at: number,
      edit_at: number,
      delete_at: number,
      is_pinned: bool,
      user_id: string,
      channel_id: string,
      root_id: string,
      parent_id: string,
      original_id: string,
      message: string,
      type: string,
      props: Object,
      hashtags: string,
      pending_post_id: string,
      reply_count: number,
      metadata: Object
  },
  _channel: {
    "id": string,
    "create_at": number,
    "update_at": number,
    "delete_at": number,
    "team_id": string,
    "type": string,
    "display_name": string,
    "name": string,
    "header": string,
    "purpose": string,
    "last_post_at": number,
    "total_msg_count": number,
    "extra_update_at": number,
    "creator_id": string,
  },
};
type Context_t = {
    server: any,
    mm: any,
    cfg: any,
    mut: {
        botAccount: any,
        botId: string,
        server: any,
        systemAdministrators: Array<any>,
        teamMembers: Array<any>,
    },
    debug: (...arg: any[]) => void,
    info: (...arg: any[]) => void,
    error: (...arg: any[]) => void,
    backtrace: () => void
}
*/

export default {};