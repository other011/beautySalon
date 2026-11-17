# ---- build -------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

# ---- run ---------------------------------------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 salon
COPY --from=build --chown=salon /build/target/quarkus-app/ ./
USER salon
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar quarkus-run.jar"]
