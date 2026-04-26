(ns sena.chat.server
  (:require [compojure.core               :refer [defroutes GET POST PUT context]]
            [compojure.route              :as route]
            [ring.adapter.jetty           :as jetty]
            [ring.middleware.json         :refer [wrap-json-body wrap-json-response]]
            [ring.middleware.params       :refer [wrap-params]]
            [ring.middleware.resource     :refer [wrap-resource]]
            [ring.middleware.content-type :refer [wrap-content-type]]
            [ring.util.response           :as resp]
            [sena.chat.graph              :as graph]
            [sena.chat.api                :as api]
            [sena.chat.voices             :as voices]
            [sena.chat.session            :as session]
            [clojure.string               :as str])
  (:gen-class))

;;; ── In-memory live-session store ─────────────────────────────────────────────
;;; Maps session-id → graph-state. Populated lazily from disk on first access.

(def ^:private live-sessions (atom {}))

(defn- get-or-load
  "Return live graph-state for sid, loading from disk if needed."
  [sid]
  (or (get @live-sessions sid)
      (when-let [gs (session/load-session sid)]
        (swap! live-sessions assoc sid gs)
        gs)))

(defn- put! [sid gs]
  (swap! live-sessions assoc sid gs)
  gs)

;;; ── Response helpers ─────────────────────────────────────────────────────────

(defn- ok        [body] (resp/response body))
(defn- created   [body] (-> (resp/response body) (resp/status 201)))
(defn- not-found [msg]  (-> (resp/response {:error msg}) (resp/status 404)))
(defn- bad-req   [msg]  (-> (resp/response {:error msg}) (resp/status 400)))

(defn- summary-of [gs]
  (let [s (graph/summary gs)]
    {:node_count   (:node-count s)
     :edge_count   (:edge-count s)
     :active_voice (name (:active-voice s))
     :session_id   (:session-id s)
     :version      (:version s)}))

;;; ── Handlers ─────────────────────────────────────────────────────────────────

(defn- create-session [_req]
  (let [sid (session/new-session-id)
        gs  (-> (graph/new-graph)
                (assoc-in [:meta :session-id] sid)
                (session/save sid))]
    (put! sid gs)
    (created (summary-of gs))))

(defn- list-sessions [_req]
  (ok {:sessions (vec (session/list-sessions))}))

(defn- get-session [sid]
  (if-let [gs (get-or-load sid)]
    (ok {:graph (:graph gs) :meta (:meta gs)})
    (not-found (str "No session: " sid))))

(defn- send-message [sid req]
  (let [content (get-in req [:body :content])]
    (cond
      (str/blank? content)
      (bad-req "body must be {\"content\": \"<non-empty string>\"}")

      (nil? (get-or-load sid))
      (not-found (str "No session: " sid))

      :else
      (let [gs           (get-or-load sid)
            active-voice (get-in gs [:graph :active-voice])
            sys-prompt   (voices/system-prompt active-voice)
            parent-id    (graph/last-node-id gs)
            gs           (graph/add-message gs :user content {:parent parent-id})
            user-msg-id  (graph/last-node-id gs)
            messages     (graph/messages-for-api gs)
            reply        (api/send-message sys-prompt messages)
            gs           (-> gs
                             (graph/add-message :assistant reply {:parent user-msg-id})
                             (session/save sid))
            asst-msg-id  (graph/last-node-id gs)
            _            (put! sid gs)]
        (ok {:user      (get-in gs [:graph :nodes user-msg-id])
             :assistant (get-in gs [:graph :nodes asst-msg-id])
             :summary   (summary-of gs)})))))

(defn- switch-voice [sid req]
  (let [v (some-> (get-in req [:body :voice]) str/trim str/lower-case)]
    (cond
      (str/blank? v)
      (bad-req "body must be {\"voice\": \"aria|nova|vex|grant\"}")

      (not (contains? voices/voices (keyword v)))
      (bad-req (str "Unknown voice \"" v "\". Options: aria nova vex grant"))

      (nil? (get-or-load sid))
      (not-found (str "No session: " sid))

      :else
      (let [gs (-> (get-or-load sid)
                   (graph/switch-voice (keyword v))
                   (session/save sid))
            _  (put! sid gs)]
        (ok {:active_voice v :summary (summary-of gs)})))))

;;; ── Routes ───────────────────────────────────────────────────────────────────

(defroutes app-routes
  (GET "/" [] (resp/redirect "/index.html"))
  (context "/api" []
    (GET  "/sessions"              req        (list-sessions req))
    (POST "/sessions"              req        (create-session req))
    (GET  "/sessions/:id"          [id]       (get-session id))
    (POST "/sessions/:id/messages" [id :as r] (send-message id r))
    (PUT  "/sessions/:id/voice"    [id :as r] (switch-voice id r)))
  (route/not-found {:error "Not found"}))

(def app
  (-> app-routes
      (wrap-json-body {:keywords? true})
      wrap-json-response
      wrap-params
      (wrap-resource "public")
      wrap-content-type))

;;; ── Entry point ──────────────────────────────────────────────────────────────

(defn -main [& _args]
  (let [port (Integer/parseInt (or (System/getenv "PORT") "3000"))]
    (println (str "Sena Chat HTTP server on port " port))
    (println "  GET  /api/sessions")
    (println "  POST /api/sessions")
    (println "  GET  /api/sessions/:id")
    (println "  POST /api/sessions/:id/messages   {\"content\":\"...\"}")
    (println "  PUT  /api/sessions/:id/voice       {\"voice\":\"aria|nova|vex|grant\"}")
    (println (str "  UI   http://localhost:" port "/"))
    (jetty/run-jetty app {:port port :join? true})))
